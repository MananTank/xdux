import produce from 'immer'
// utils
import clone from './utils/clone'
import { NO_INIT_VALUE_ERROR } from './utils/errors'
import shallowEqual from './utils/shallowEqual'
// store builders
import addReactives from './storeBuilders/reactives'

// documentation explaining the code ->

const xedux = ({ slices, savedState, effects = {}, middlewares = [], constants }) => {
  // data structures
  const state = {}
  const dependencyMap = {}
  const dispatchers = {}
  const listeners = []
  let currentMutation = {}

  // ----------------------------------------------------
  const mutateState = (key, value) => { state[key] = value }

  // ----------------------------------------------------
  const isValidAction = action => {
    const [p1, p2] = action.split('.')
    return p2 ? (p1 in slices && p2 in slices[p1].reducers) : (p1 in effects)
  }

  // ----------------------------------------------------
  let dispatch = (action, payload, options = {}) => {
    const [p1, p2] = action.split('.') // split the action to two parts

    if (p2) { // if there are two parts, p1 is a sliceName, p2 is reducerName
      const sliceName = p1
      const reducerName = p2
      const preprocess = slices[sliceName].preprocess

      // if action is not processed, and needs preprocessing
      if (!options.preprocessed && preprocess && preprocess[reducerName]) {
        let sendCalled = false
        const send = processedPayload => {
          sendCalled = true
          dispatch(action, processedPayload, { ...options, preprocessed: true })
        }
        const returned = preprocess[reducerName](payload, send)
        // if a value is returned and send has not been called. use the returned value as processed payload
        if (returned && !sendCalled) send(returned)
      } else {
        currentMutation = {
          action: action,
          payload: payload,
          updatedSlices: {},
          synthetic: options.synthetic || false
        }

        if (!isValidAction(action)) throw new Error(`invalid action ${action}`)

        const reducer = slices[sliceName].reducers[reducerName]

        const oldState = state[sliceName]
        const newState = produce(oldState, draft => reducer(draft, payload, constants))

        if (!shallowEqual(oldState, newState)) {
          mutateState(sliceName, newState)
          currentMutation.updatedSlices[sliceName] = { newState, oldState }
          notifyDependents(sliceName)
        }
      }
    } else { // if there is no p2, p1 is effectName
      const effectName = p1
      // check if the effectName is valid
      // if it is then ->
      effects[effectName]({ dispatch, state, payload })
    }

    listeners.forEach(listener => listener(currentMutation))
    return currentMutation
  }

  // ----------------------------------------------------
  const subscribe = listener => {
    listeners.push(listener)
    const unsubsribe = () => {
      const index = listeners.findIndex(l => l === listener)
      listeners.splice(index, 1)
    }

    return unsubsribe
  }

  // ----------------------------------------------------
  const onSliceChange = (sliceNames, callback) => {
    return subscribe(mutation => {
      const shouldCall = sliceNames.some(s => s in mutation.updatedSlices)
      if (shouldCall) callback(sliceNames.map(s => state[s]))
    }
    )
  }

  // ----------------------------------------------------
  const callReactor = sliceName => {
    const { deps, reactor } = slices[sliceName]
    const depStates = deps.map(dep => state[dep])
    return produce(depStates, draft => reactor(...draft, constants))
  }

  // ----------------------------------------------------
  const notifyDependents = sliceName => {
    if (sliceName in dependencyMap) {
      for (const dependent of dependencyMap[sliceName]) {
        const oldState = state[dependent]
        const newState = callReactor(dependent)

        if (!shallowEqual(oldState, newState)) {
          mutateState(dependent, newState)
          currentMutation.updatedSlices[dependent] = { oldState, newState }
          notifyDependents(dependent)
        }
      }
    }
  }

  // ----------------------------------------------------
  const syntheticUpdate = (updatedSlices) => {
    const currentMutation = { updatedSlices, synthetic: true }
    for (const sliceName in updatedSlices) {
      mutateState(sliceName, updatedSlices[sliceName])
    }
    listeners.forEach(l => l(currentMutation))
  }

  // ----------------------------------------------------
  const syntheticReset = () => {
    const initState = clone(initialState)
    const updatedSlices = {}
    for (const sliceName in initState) {
      updatedSlices[sliceName] = initState[sliceName]
    }
    syntheticUpdate(updatedSlices)
  }

  // add non reactives ---------------------------------
  for (const sliceName in slices) {
    const slice = slices[sliceName]
    if (!slice.deps) {
      if (!('initialState' in slice)) NO_INIT_VALUE_ERROR(sliceName)
      mutateState(sliceName, slice.initialState)
    }
  }

  // ----------------------------------------------------
  // merge saved state
  if (savedState) {
    for (const sliceName in savedState) {
      mutateState(sliceName, savedState[sliceName])
    }
  }

  // ----------------------------------------------------
  addReactives(state, mutateState, callReactor, slices, dependencyMap)

  // save initial State ---------------------------------
  const initialState = clone(state)

  // add middlewares ------------------------------------
  for (const middleware of middlewares.slice().reverse()) {
    dispatch = middleware(dispatch, state)
  }

  // add dispatchers ------------------------------------
  for (const sliceName in slices) {
    const reducers = slices[sliceName].reducers
    if (reducers) {
      for (const reducerName in reducers) {
        const action = sliceName + '.' + reducerName
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
    onSliceChange,
    dispatchers,
    slices
  }
}

export default xedux
