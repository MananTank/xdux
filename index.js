import {
	INVALID_VERB_ERROR,
	NO_REACTIVE_CALCULATOR,
	CYCLIC_DEPENDENCY_ERROR,
	INVALID_DEP_ERROR,
	NO_INIT_VALUE_ERROR,
} from './errors';

import { hasCyclicDeps, simpleDeepClone } from './helpers';

const xedux = ({ controllers, savedState, effects }) => {
	const state = {};
	const actionTypeProcessors = {}; // object containing verbs as keys and processor arrays as value
	const reactives = {}; // object containing key as state key and value is object of shape {  deps: [], reactor: fn() }
	// let middlewares = []; // array of middleware functions
	let listeners = []; // array of listener functions

	const notifyListeners = key => {
		// when key is changed, noify all listeners that 'key' changed
		listeners.forEach(l => l(key));
	};

	const notifyDependants = key => {
		// key changed, notify all key's dependants that key changed
		// when any of values that dependant depends on changes, update its value by calling reactor
		const updateDependant = dependant => {
			const newValues = dependant.deps.map(d => state[d]);
			dependant.reactor(...newValues);
		};

		const dependants = reactives[key];
		if (!dependants) return;
		dependants.forEach(updateDependant);
	};

	const dispatch = (actionType, actionData, compName) => {
		const processors = actionTypeProcessors[actionType];
		if (processors === undefined) INVALID_VERB_ERROR(actionType, compName);
		return processors.map(p => p(actionData)); // execute and return arrays of keys that changed
		// in most cases this will be an array of only one key, since most of the ime, each action triggers a single reducer
	};

	const subscribe = listener => {
		listeners.push(listener);
		const unsubscribe = () => {
			listeners = listeners.filter(l => l !== listener);
		};

		return unsubscribe;
	};

	// ****************************************

	const addNonReactives = () => {
		const createProcessor = (key, reducer, actionType) => actionData => {
			const oldValue = simpleDeepClone(state[key]);
			let newValue = state[key];
			const returnedValue = reducer(newValue, actionData);
			if (returnedValue !== undefined) {
				newValue = returnedValue;
			}

			if (oldValue !== newValue) {
				state[key] = newValue;
				notifyListeners(key);
				notifyDependants(key);
			}
			return key; // return the key that the processor changed in state
		};

		const buildVerbProcessor = (key, controller) => {
			for (const actionType in controller.reducers) {
				const reducer = controller.reducers[actionType]; // get reducer for the actionType from controller
				if (!actionTypeProcessors[actionType]) actionTypeProcessors[actionType] = []; // if processors array for actionType is undefined, make empty array
				const processor = createProcessor(key, reducer, actionType); // create a processor for this actionType
				actionTypeProcessors[actionType].push(processor); // add processor to processors array for procesing actionType
			}

			for (const actionType in controller.dispatchers) {
				const reducer = controller.dispatchers[actionType];
				const dispatcherPorcessor = actionData => {
					const oldValue = state[key];
					reducer(dispatch, oldValue, actionData);
				};

				if (!actionTypeProcessors[actionType]) actionTypeProcessors[actionType] = [];
				actionTypeProcessors[actionType].push(dispatcherPorcessor);
			}
		};

		for (const key in controllers) {
			const controller = controllers[key];
			if ('deps' in controller) {
				pendingReactives.push(key);
				continue; // ignore reactives
			}
			if (!('initialState' in controller)) NO_INIT_VALUE_ERROR(key);
			state[key] = controller.initialState;
			buildVerbProcessor(key, controller); // build actionType processor
		}
	};

	const mergeSavedState = () => {
		if (savedState) {
			for (const key in savedState) {
				state[key] = savedState[key];
			}
		}
	};

	const addReactivesToState = () => {
		// ---
		const addReactive = (key, deps, controller) => {
			const handleReactiveChange = (...x) => {
				state[key] = controller.reactor(...x);
				notifyListeners(key);
				notifyDependants(key);
			};

			for (const d of deps) {
				if (reactives[d] === undefined) reactives[d] = [];
				reactives[d].push({
					reactor: handleReactiveChange,
					deps,
				});
			}
		};

		const pendingReactivesHistory = []; // histroy is maintained to figure out cyclic deps
		if (pendingReactives.length) {
			pendingReactivesHistory.push([...pendingReactives]);
		}

		while (pendingReactives.length) {
			const key = pendingReactives[0]; // check for reactive key 'key'
			if (!('reactor' in controllers[key])) NO_REACTIVE_CALCULATOR(key);

			const controller = controllers[key];

			let success = true; // sucess, if the reactive's initial could be calculated right away
			const depsValues = []; // value of keys which the reactive depends on

			for (const d of controller.deps) {
				if (!(d in controllers)) INVALID_DEP_ERROR(d, key);

				// if dependent value is itself not calculated, move the key to end, to calculate this later
				if (!(d in state)) {
					pendingReactives.shift();
					pendingReactives.push(key);
					success = false;
					break;
				}

				depsValues.push(state[d]); // if dependent value, is availabe, push in deps values
			}

			// if all of deps value are available, reactive's value can be calculate by calling reactor function
			if (success) {
				state[key] = controller.reactor(...depsValues); // resolve initial value and save
				pendingReactives.shift(); // remove this key from pending, because it's value is now resolved
				addReactive(key, controller.deps, controller);
			}

			// detect cyclic dependencies
			// if current state of pendingReactives match any of the history we have cyclic dep
			if (hasCyclicDeps(pendingReactives, pendingReactivesHistory)) {
				CYCLIC_DEPENDENCY_ERROR(pendingReactives);
			}

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

	// ****************************************
	const pendingReactives = [];
	addNonReactives();
	mergeSavedState();
	addReactivesToState();
	addEffects();

	return {
		dispatch,
		subscribe,
		state,
	};
};

export default xedux;
