
import produce from 'immer'

// utils
import clone from './utils/clone'
import { NO_INIT_VALUE_ERROR } from './utils/errors'
import shallowEqual from './utils/shallowEqual'

// store builders
import addPreprocessors from './storeBuilders/preprocessors'
import addMiddlewares from './storeBuilders/middlewares'
import addReactives from './storeBuilders/reactives'
import mergeSavedState from './storeBuilders/mergeSaved'

// shape of reliesOn:
// reliesOn: {
// count: ['filteredTodos'],
// currentFilter: ['filteredTodos']
// }

const xedux = ({ slices, savedState, effects, middlewares, constants }) => {
  const state = {}

  // object, key is sliceName, value is an array of reactive sliceNames that relies on that sliceName
  const reliesOn = {}

  // key is the action, value is preprocessor for that action
  const preprocessors = {}

  // key is an action, value is the dispatcher (function that calls dispatch )
  // dispatcher is a partial application of dispatch function with action filled
  const dispatchers = {}

  // array of function that should be called when state changes
  const listeners = []

  // object that stores what is current action doing in the state
  // shape :
  const currentMutation = {}

  const mutateState = (key, value) => { state[key] = value }
  const isValidAction = action => {
    const [part1, part2] = action.split('/')
    if (part2) {
      if (part1 in slices) {
        return part2 in slices[part1]
      } else return false
    } else {
      return part1 in effects
    }
  }

  // dispatch will be reassigned if there are middlewares
  // eslint-disable-next-line prefer-const
  let dispatch = (action, payload, options = {}) => {
    if (!options.preprocessed && preprocessors[action]) {
      preprocessors[action](payload, options)
    } else {
      // reset
      currentMutation.action = null
      currentMutation.payload = null
      currentMutation.updatedSlices = {}
      currentMutation.synthetic = options.synthetic || false

      const [part1, part2] = action.split('/')

      // if the action is made up of two words seperated by '/', it means it is not an effect
      if (part2) {
        const sliceName = part1
        const reducerName = part2
        // check if its a valid sliceName
        // check if its a valid reducerName
        // it it is ->
        const reducer = slices[sliceName].reducers[reducerName]
        const oldState = state[sliceName]
        const newState = produce(oldState, draft => reducer(draft, payload, constants))
        // console.log('newState is ', newState)

        if (!shallowEqual(oldState, newState)) {
          mutateState(sliceName, newState)
          currentMutation.updatedSlices[sliceName] = { newState, oldState }
          notifyDependentsOfSlice(sliceName)
        }
      } else {
        // if its an effect
        const effectName = part1
        // check if the effectName is valid
        // if it is then ->
        effects[effectName]({ dispatch, state, payload })
      }

      listeners.forEach(listener => listener(currentMutation))
      return currentMutation
    }
  }

  // subscribe takes a function that is called every time state changes
  // returns an unsubscribe function which is used to unsubscribe from the state changes
  const subscribe = listener => {
    listeners.push(listener)
    const unsubsribe = () => {
      const index = listeners.findIndex(l => l === listener)
      listeners.splice(index, 1)
    }

    return unsubsribe
  }

  const callReactor = sliceName => {
    const { deps, reactor } = slices[sliceName]
    const depStates = deps.map(dep => state[dep])
    return produce(depStates, draft => reactor(...draft, constants))
  }

  // call handleDepsChange of all the dependants of slice
  // when slice's state is changed, call this function to tell its dependants to update themselves
  const notifyDependentsOfSlice = sliceName => {
    const reliers = reliesOn[sliceName]
    if (!reliers) return
    for (const relier of reliers) {
      const oldState = state[relier]
      const newState = callReactor(relier)

      if (!shallowEqual(oldState, newState)) {
        mutateState(relier, clone(newState))
        currentMutation.updatedSlices[relier] = { oldState, newState }
        notifyDependentsOfSlice(relier)
      }
    }
  }

  // synthetic updates (and reset) are not to be done by user of xedux, but things like devtools

  // set state of several slices by giving an object, update UI too
  // synthetic update is not called as a result of user actions
  const syntheticUpdate = (updatedSlices) => {
    const currentMutation = { updatedSlices, synthetic: true }
    for (const sliceName in updatedSlices) {
      mutateState(sliceName, updatedSlices[sliceName])
    }
    listeners.forEach(l => l(currentMutation))
  }

  // reset the state to initial State, reset the UI too
  const syntheticReset = () => {
    const initState = clone(initialState)
    const updatedSlices = {}
    for (const sliceName in initState) {
      updatedSlices[sliceName] = initState[sliceName]
    }
    syntheticUpdate(updatedSlices)
  }

  // add non reactives to state
  for (const sliceName in slices) {
    const slice = slices[sliceName]
    if (!slice.deps) {
      if (!('initialState' in slice)) NO_INIT_VALUE_ERROR(sliceName)
      mutateState(sliceName, slice.initialState) // set state for slice
    }
  }

  mergeSavedState(savedState, mutateState)
  addReactives(state, mutateState, callReactor, slices, reliesOn)
  addMiddlewares(middlewares, state, dispatch)
  addPreprocessors(preprocessors, slices, dispatch)

  // keep a copy of original initialState
  // useful for reseting the state via devtools
  const initialState = clone(state)

  // bulid dispatchers
  // in order to return stable dispatchers from useAction() hook, these functions need to be memoized
  for (const sliceName in slices) {
    const reducers = slices[sliceName].reducers
    if (reducers) {
      for (const reducerName in reducers) {
        const action = sliceName + '/' + reducerName
        dispatchers[action] = payload => dispatch(action, payload)
      }
    }
  }

  // store
  return {
    dispatch,
    subscribe,
    state,
    constants,
    syntheticUpdate,
    syntheticReset,
    isValidAction,
    dispatchers
  }
}

export default xedux
