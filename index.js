import { NO_INIT_VALUE_ERROR, INVALID_VERB_ERROR } from './errors';

const xedux = (managers, savedState) => {
	const state = {};
	const verbProcessor = {};
	let listeners = [];

	if (savedState) {
		for (const key in savedState) state[key] = savedState[key];
	}

	// building store --------------------
	for (const key in managers) {
		if (!('X' in managers[key])) NO_INIT_VALUE_ERROR(key);

		// construct state with X values
		state[key] = managers[key]['X'];

		const reducers = managers[key];

		for (const verb in reducers) {
			const reducer = reducers[verb];
			if (!verbProcessor[verb]) verbProcessor[verb] = [];

			const processor = adverb => {
				state[key] = reducer(state[key], adverb);
				listeners.forEach(l => l(key));
			};

			verbProcessor[verb].push(processor);
		}
	}

	// ------------------------------------------------------------
	const dispatch = (verb, adverb) => {
		const processors = verbProcessor[verb];
		if (processors === undefined) INVALID_VERB_ERROR(verb);
		processors.forEach(p => p(adverb));
	};

	// ------------------------------------------------------------
	const subscribe = listener => {
		listeners.push(listener);
		const unsubscribe = () => {
			listeners = listeners.filter(l => l !== listener);
		};

		return unsubscribe;
	};

	// ------------------------------------------------------------
	const store = {
		dispatch,
		subscribe,
		state,
	};

	return store;
};

export default xedux;
