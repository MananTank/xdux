class Store {
	constructor(handlers, persistedState) {
		this.state = {};
		this.processors = {};
		this.listeners = [];

		this.handle(handlers);
		if (persistedState) this.state = { ...this.state, ...persistedState };
		this.dispatch = this.dispatch.bind(this); // bind, to avoid confusion when dispatch is called inside a class component
	}

	handle(handlers) {
		for (const dataItem in handlers) {
			// construct initial state
			// add initial value of dataItem to state which is specified with '$'
			if (!('$' in handlers[dataItem]))
				throw new Error(
					`"${dataItem}" is missing initial value. Specify its initial value using $ key in the handler`
				);

			this.state[dataItem] = handlers[dataItem]['$'];
			// throw error if trying to add handlers on key that does not exist in state
			if (!(dataItem in this.state)) {
				throw new Error(
					`No data item named "${dataItem}" exist in state of the store
          Either you missplled it or forgot to add this data item in state`
				);
			}

			const reducers = handlers[dataItem];

			for (const verb in reducers) {
				const reducer = reducers[verb];

				// if processors array for this verb does not exist, create array
				if (!this.processors[verb]) this.processors[verb] = [];

				// create processor for the verb, and push it in processors[verb]

				// processor calls reducer, sets new state, triggers listeners
				const processor = payload => {
					const oldState = this.state[dataItem];
					const newState = reducer(oldState, payload);

					if (oldState !== newState) {
						this.state[dataItem] = newState;
						this.listeners.forEach(listener => listener(dataItem));
					}
				};

				this.processors[verb].push(processor);
			}
		}
	}

	dispatch(verb, payload) {
		// throw error when trying to dispatch an verb for which there is no handler added in store
		if (this.processors[verb] === undefined) {
			throw new Error(
				`INVALID VERB: "${verb}"\n` + `Either you misspelled it OR you forgot to add reducer for it`
			);
		}
		this.processors[verb].forEach(processor => processor(payload));
	}

	// when state changes, listener is called
	// listener can then have its own logic whether to trigger re-render or not based what has changed in state.
	// if data 'x' has changed in state, but a component does not use 'x', no needed to trigger re-render for that component
	subscribe(listener) {
		this.listeners.push(listener);
		// return unsubscriber - calling this removes the listener from listeners
		// this is done when the component for which the listener was added, is going to be unmounted
		// so, call this in componentWillUnmount (in react )
		return () => (this.listeners = this.listeners.filter(l => l !== listener));
	}
}

export default Store;

/*
terminology :

handler is an object that handles updating data in response to various verbs
handler contains verb as key and reducer as value

verb is a string that expressees what happened in action
adverb is the optional data that supports verb
for example "increment by 5"
verb - increment, adverb - 5

action is an array of verb and adverb - [verb, adverb]
example - ['INCREMENT', 5]

this.processors :
it represents which functions(reducers) should be called when some verb is dispatched
this is different from Redux, in which all the reducers are called when an action is dispatched, and reducer them self make decision whether to do something or not

example

If you define handle like this

store.handle({
  counter1: {
    INCREMENT: x => x + 1, // incrementReducer1
    DECREMENT: x => x - 1, // decrementReducer
  },

  counter2: {
    INCREMENT: x => x + 10 // incrementReducer2
  }
})

this is how this.processors will look like

this.processors = {
  INCREMENT: [incrementReducer1, incrementReducer2]
  DECREMENT: [decrementReducer],
}

as shown in the above example, a single verb can trigger multiple reducers

so, if you do :

dispatch('INCREMENT')
// counter1's value will increment by 1
// counter2's value will increment by 10

dispatch('DECREMENT')
// counter1's value will decrement by 1

*/
