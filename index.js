
import clone from './helpers/clone'

// store builders
import addPreprocessors from './storeBuilders/preprocessors'
import addMiddlewares from './storeBuilders/middlewares'
import addEffects from './storeBuilders/effects'
import addNonReactives from './storeBuilders/non-reactives'
import addReactives from './storeBuilders/reactives'
import mergeSavedState from './storeBuilders/mergeSaved'

const xedux = ({ slices, savedState, effects, middlewares, constants }) => {
  const state = {}
  const actionProcessor = {}
  const reactives = {}
  const pendingReactives = []
  const preprocessors = {}
  const dispatchers = {}
  const listeners = []
  const mutation = {}

  const mutateState = (key, value) => { state[key] = value }
  const isValidActionType = actionType => !(actionProcessor[actionType] === undefined)

  // dispatch will be reassigned if there are middlewares
  // eslint-disable-next-line prefer-const
  let dispatch = (actionType, actionData, options = {}) => {
    if (!options.preprocessed && preprocessors[actionType]) {
      preprocessors[actionType](actionData, options)
    } else {
      // reset
      mutation.actionType = null
      mutation.actionData = null
      mutation.updatedSlices = {}
      mutation.synthetic = options.synthetic || false

      actionProcessor[actionType](actionData)
      listeners.forEach(listener => listener(mutation))
      return mutation
    }
  }

  const subscribe = listener => {
    listeners.push(listener)
    const unsubsribe = () => {
      const index = listeners.findIndex(l => l === listener)
      listeners.splice(index, 1)
    }

    return unsubsribe
  }

  const notifyDependentsOfSlice = sliceName => {
    const dependants = reactives[sliceName]
    if (!dependants) return
    dependants.forEach(dependant => dependant.handleDepsChange())
  }

  // set state of several slices by giving an object, update UI too
  const syntheticUpdate = (updatedSlices) => {
    const mutation = { updatedSlices, synthetic: true }
    for (const sliceName in updatedSlices) {
      mutateState(sliceName, updatedSlices[sliceName])
    }
    listeners.forEach(l => l(mutation))
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

  addNonReactives(slices, state, mutateState, mutation, notifyDependentsOfSlice, constants, actionProcessor, pendingReactives)
  mergeSavedState(savedState, mutateState)
  addReactives(state, slices, reactives, mutateState, mutation, notifyDependentsOfSlice, pendingReactives, constants)
  addEffects(effects, state, actionProcessor, dispatch)
  addMiddlewares(middlewares, state, dispatch)
  addPreprocessors(preprocessors, slices, dispatch)

  // save a copy of original initialState;
  const initialState = clone(state)

  // bulid dispatchers
  for (const action in actionProcessor) {
    dispatchers[action] = payload => dispatch(action, payload)
  }

  return {
    dispatch,
    subscribe,
    state,
    constants,
    syntheticUpdate,
    syntheticReset,
    isValidActionType,
    dispatchers
  }
}

export default xedux
