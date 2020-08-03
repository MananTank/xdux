import * as errors from './helpers/errors';
import hasCyclicDeps from './helpers/cyclicDeps';
import clone from './helpers/clone';
import deepEqual from './helpers/deepEqual';

// TODO: ability to configure subscribe listeners to avoid doing too much work for listeners that do not use that info

const xedux = ({ slices, savedState, effects, middlewares, statics }) => {
	const state = {};
	const actionTypeProcessors = {}; // object containing verbs as keys and processor arrays as value
	const reactives = {}; // object containing key as state key and value is object of shape {  deps: [], reactor: fn() }
	let listeners = []; // array of listener functions
	let currentActionInfo; // an object which store details about dispatched actions and what changes the action is making in the store

	// to centralize mutation in one place
	const mutateState = (key, value) => {
		state[key] = value;
	};

	let dispatch = (actionType, actionData, compName) => {
		// reset
		currentActionInfo = {
			actionType,
			actionData,
			component: compName,
			updatedSlices: {},
		};
		const processors = actionTypeProcessors[actionType];
		if (processors === undefined) errors.INVALID_ACTION_TYPE_ERROR(actionType, compName);
		processors.forEach(processor => processor(actionData));
		listeners.forEach(listener => listener(currentActionInfo));
	};

	const subscribe = (listener, configure) => {
		listeners.push(listener);
		const unsubscribe = () => {
			listeners = listeners.filter(l => l !== listener);
		};

		return unsubscribe;
	};

	const notifyDependentsOfSlice = sliceName => {
		const dependants = reactives[sliceName];
		if (!dependants) return;
		dependants.forEach(dependant => dependant.handleDepsChange());
	};

	const callReactor = sliceName => {
		const depsValues = slices[sliceName].deps.map(dep => state[dep]);
		return slices[sliceName].reactor(...depsValues, statics);
	};

	// ****************************************

	const addNonReactives = () => {
		// create processor
		const createProcessor = (sliceName, reducer) => {
			const processor = actionData => {
				const oldState = state[sliceName];
				const newState = reducer(state[sliceName], actionData, statics);
				if (newState === undefined) errors.CAN_NOT_RETURN_UNDEFINED(reducer.name);

				if (!deepEqual(oldState, newState)) {
					mutateState(sliceName, newState);
					currentActionInfo.updatedSlices[sliceName] = { newState, oldState };
					notifyDependentsOfSlice(sliceName);
				}
			};

			return processor;
		};

		const addProcessors = sliceName => {
			const reducers = slices[sliceName].reducers;
			for (const actionType in reducers) {
				const reducer = reducers[actionType];
				const processor = createProcessor(sliceName, reducer);
				if (actionTypeProcessors[actionType] === undefined) actionTypeProcessors[actionType] = [];
				actionTypeProcessors[actionType].push(processor);
			}
		};

		for (const sliceName in slices) {
			const slice = slices[sliceName];
			if (slice.deps) {
				pendingReactives.push(sliceName);
				continue; // ignore reactives
			}
			if (!('initialState' in slice)) errors.NO_INIT_VALUE_ERROR(sliceName);
			mutateState(sliceName, slice.initialState);
			addProcessors(sliceName);
		}
	};

	const mergeSavedState = () => {
		if (savedState) {
			for (const sliceName in savedState) {
				mutateState(sliceName, savedState[sliceName]);
			}
		}
	};

	const addReactivesToState = () => {
		// ---
		const addReactiveProcessor = sliceName => {
			const handleDepsChange = () => {
				const oldState = state[sliceName];
				const newState = callReactor(sliceName);
				if (newState === undefined) errors.CAN_NOT_RETURN_UNDEFINED(sliceName);
				if (!deepEqual(oldState, newState)) {
					mutateState(sliceName, clone(newState));
					currentActionInfo.updatedSlices[sliceName] = { oldState, newState };
					notifyDependentsOfSlice(sliceName);
				}
			};

			// make reactive and add in reactives
			for (const dep of slices[sliceName].deps) {
				if (reactives[dep] === undefined) reactives[dep] = [];
				reactives[dep].push({
					handleDepsChange,
					deps: slices[sliceName].deps,
				});
			}
		};

		const pendingReactivesHistory = []; // histroy is maintained to figure out cyclic deps

		// is there are reactive slices
		if (pendingReactives.length) pendingReactivesHistory.push([...pendingReactives]);

		// while not all the reactive slices are added in state
		while (pendingReactives.length) {
			// pick first sliceName in pending
			const sliceName = pendingReactives[0]; // check for reactive sliceName 'sliceName'
			const slice = slices[sliceName];
			if (!slice.reactor) errors.NO_REACTOR(sliceName);

			let success = true; // sucess, if the reactive's initial could be calculated right away

			for (const dep of slice.deps) {
				if (!slices[dep]) errors.INVALID_DEP_ERROR(dep, sliceName);

				// if dependent value is itself not calculated, move the sliceName to end, to calculate this later
				if (!(dep in state)) {
					pendingReactives.shift();
					pendingReactives.push(sliceName);
					success = false;
					break;
				}
			}

			// if all of deps value are available, reactive's value can be calculate by calling reactor function
			if (success) {
				mutateState(sliceName, callReactor(sliceName));
				pendingReactives.shift(); // remove this sliceName from pending, because it's value is now resolved
				addReactiveProcessor(sliceName);
			}

			if (hasCyclicDeps(pendingReactives, pendingReactivesHistory))
				errors.CYCLIC_DEPENDENCY_ERROR(pendingReactives);

			pendingReactivesHistory.push([...pendingReactives]);
		} // while end ---
	};

	const addEffects = () => {
		for (const actionType in effects) {
			const effect = effects[actionType];
			const effectProcessor = actionData => {
				effect(dispatch, state);
			};

			if (actionTypeProcessors[actionType] === undefined) actionTypeProcessors[actionType] = [];
			actionTypeProcessors[actionType].push(effectProcessor);
		}
	};

	const addMiddlewares = () => {
		if (middlewares && middlewares.length) {
			for (const middleware of middlewares.slice().reverse()) {
				dispatch = middleware({ dispatch, state });
			}
		}
	};

	// ****************************************
	const pendingReactives = [];
	addNonReactives();
	mergeSavedState();
	addReactivesToState();
	addEffects();
	addMiddlewares();

	return {
		dispatch,
		subscribe,
		state,
		statics,
	};
};

export default xedux;
