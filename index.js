import * as errors from './helpers/errors'
import hasCyclicDeps from './helpers/cyclicDeps'
import clone from './helpers/clone'
import deepEqual from './helpers/deepEqual'

/* TODO: ability to configure subscribe listeners to avoid doing too
 much work for listeners that do not use that info  */

const xedux = ({ slices, savedState, effects, middlewares, constants }) => {
  const state = {}
  const actionTypeProcessors = {}
  const reactives = {}
  let listeners = []
  let mutation
  const pendingReactives = []
  const preprocessors = {}

  const componentUsage = {}
  // componentX : { sliceNames: [], dispatchers: [], actionTypes: [] }

  // to build stats and memoize dispatchers
  // this function is called by each component when it re-renders
  // this function only does its job one time per component
  // after that data is memoised
  const addActionTypeUsage = (component, actionTypes) => {
    if (componentUsage[component] === undefined) {
      componentUsage[component] = {}
    }

    // if actionTypes are already defined, do nothing, else add
    // so this will be executed only 1 time per unique component.
    // ( even if same component is rendered many times, this will only be executed once )
    if (componentUsage[component].actionTypes === undefined) {
      console.log('calc action Types')
      componentUsage[component].actionTypes = []
      componentUsage[component].dispatchers = []
      actionTypes.forEach(actionType => {
        if (!isValidActionType(actionType)) throw new Error(`Invalid action type "${actionType}" used in useDispatch hook in <${component}/>, no such action type exists`)
        const dispatcher = (actionData) => dispatch(actionType, actionData, { component })
        componentUsage[component].actionTypes.push(actionType)
        componentUsage[component].dispatchers.push(dispatcher)
      })
    }
  }

  const addSliceUsage = (component, sliceName) => {
    if (componentUsage[component] === undefined) componentUsage[component] = {}
    if (componentUsage[component].sliceNames === undefined) {
      componentUsage[component].sliceNames = []
    }
    if (!componentUsage[component].sliceNames.includes(sliceName)) {
      componentUsage[component].sliceNames.push(sliceName)
    }
  }

  const addConstUsage = (component, constNames) => {
    if (componentUsage[component] === undefined) componentUsage[component] = {}
    if (componentUsage[component].constants === undefined) {
      componentUsage[component].constants = []
      componentUsage[component].constants = constNames.map(constName => constants[constName])
    }
  }

  // to centralize mutation in one place
  const mutateState = (key, value) => {
    state[key] = value
  }

  const isValidActionType = actionType => !(actionTypeProcessors[actionType] === undefined)

  let dispatch = (actionType, actionData, options) => {
    if (!options.preprocessed && preprocessors[actionType]) {
      preprocessors[actionType](actionData, options)
    } else {
      // reset
      mutation = {
        actionType,
        actionData,
        component: options.component,
        updatedSlices: {},
        synthetic: options.synthetic || false
      }

      if (!isValidActionType(actionType)) {
        errors.INVALID_ACTION_TYPE_ERROR(actionType, options.component)
      }
      const processors = actionTypeProcessors[actionType]
      processors.forEach(processor => processor(actionData))
      listeners.forEach(listener => listener(mutation))

      return mutation
    }
  }

  const subscribe = listener => {
    listeners.push(listener)
    const unsubscribe = () => {
      listeners = listeners.filter(l => l !== listener)
    }

    return unsubscribe
  }

  const notifyDependentsOfSlice = sliceName => {
    const dependants = reactives[sliceName]
    if (!dependants) return
    dependants.forEach(dependant => dependant.handleDepsChange())
  }

  const callReactor = sliceName => {
    const depsValues = slices[sliceName].deps.map(dep => state[dep])
    return slices[sliceName].reactor(...depsValues, constants)
  }

  // ****************************************

  const addNonReactives = () => {
    // create processor
    const createProcessor = (sliceName, reducer, actionType) => {
      const processor = actionData => {
        const oldState = state[sliceName]
        const newState = reducer(oldState, actionData, constants)

        if (newState === undefined) {
          errors.CAN_NOT_RETURN_UNDEFINED(reducer.name)
        }

        if (!deepEqual(oldState, newState)) {
          mutateState(sliceName, newState)
          mutation.updatedSlices[sliceName] = { newState, oldState }
          notifyDependentsOfSlice(sliceName)
        }
      }

      return processor
    }

    const addProcessors = sliceName => {
      const { reducers } = slices[sliceName]
      for (const actionType in reducers) {
        const reducer = reducers[actionType]
        const processor = createProcessor(sliceName, reducer, actionType)
        if (actionTypeProcessors[actionType] === undefined) {
          actionTypeProcessors[actionType] = []
        }
        actionTypeProcessors[actionType].push(processor)
      }
    }

    for (const sliceName in slices) {
      const slice = slices[sliceName]
      if (slice.deps) {
        pendingReactives.push(sliceName)
      } else {
        if (!('initialState' in slice)) errors.NO_INIT_VALUE_ERROR(sliceName)
        mutateState(sliceName, slice.initialState)
        addProcessors(sliceName)
      }
    }
  }

  const mergeSavedState = () => {
    if (savedState) {
      for (const sliceName in savedState) {
        mutateState(sliceName, savedState[sliceName])
      }
    }
  }

  const addReactivesToState = () => {
    // ---
    const addReactiveProcessor = sliceName => {
      const handleDepsChange = () => {
        const oldState = state[sliceName]
        const newState = callReactor(sliceName)
        if (newState === undefined) errors.CAN_NOT_RETURN_UNDEFINED(sliceName)
        if (!deepEqual(oldState, newState)) {
          mutateState(sliceName, clone(newState))
          mutation.updatedSlices[sliceName] = { oldState, newState }
          notifyDependentsOfSlice(sliceName)
        }
      }

      // make reactive and add in reactives
      for (const dep of slices[sliceName].deps) {
        if (reactives[dep] === undefined) reactives[dep] = []
        reactives[dep].push({
          handleDepsChange,
          deps: slices[sliceName].deps
        })
      }
    }

    const pendingReactivesHistory = [] // histroy is maintained to figure out cyclic deps

    // is there are reactive slices
    if (pendingReactives.length) {
      pendingReactivesHistory.push([...pendingReactives])
    }

    // while not all the reactive slices are added in state
    while (pendingReactives.length) {
      // pick first sliceName in pending
      const sliceName = pendingReactives[0] // check for reactive sliceName 'sliceName'
      const slice = slices[sliceName]
      if (!slice.reactor) errors.NO_REACTOR(sliceName)

      let success = true // sucess, if the reactive's initial could be calculated right away

      for (const dep of slice.deps) {
        if (!slices[dep]) errors.INVALID_DEP_ERROR(dep, sliceName)

        // if dependent value is itself not calculated,
        // move the sliceName to end, to calculate this later
        if (!(dep in state)) {
          pendingReactives.shift()
          pendingReactives.push(sliceName)
          success = false
          break
        }
      }

      // if all of deps value are available,
      // reactive's value can be calculate by calling reactor function
      if (success) {
        mutateState(sliceName, callReactor(sliceName))
        // remove this sliceName from pending, because it's value is now resolved
        pendingReactives.shift()

        addReactiveProcessor(sliceName)
      }

      if (hasCyclicDeps(pendingReactives, pendingReactivesHistory)) {
        errors.CYCLIC_DEPENDENCY_ERROR(pendingReactives)
      }

      pendingReactivesHistory.push([...pendingReactives])
    } // while end ---
  }

  const addEffects = () => {
    for (const actionType in effects) {
      const effect = effects[actionType]
      const effectProcessor = actionData => effect(dispatch, state, actionData)
      if (actionTypeProcessors[actionType] === undefined) {
        actionTypeProcessors[actionType] = []
      }
      actionTypeProcessors[actionType].push(effectProcessor)
    }
  }

  const addMiddlewares = () => {
    if (middlewares && middlewares.length) {
      for (const middleware of middlewares.slice().reverse()) {
        dispatch = middleware({ dispatch, state })
      }
    }
  }

  // synthetically update state of store
  // meaning that these updates are not result of user's interaction
  // but by something like a devtool, trying to change stuff
  const syntheticUpdate = (updatedSlices) => {
    const mutation = {
      updatedSlices,
      synthetic: true
    }

    Object.keys(updatedSlices).forEach(sliceName => {
      mutateState(sliceName, updatedSlices[sliceName])
    })

    listeners.forEach(l => l(mutation))
  }

  // reset the state to initial State
  // update UI too
  const syntheticReset = () => {
    const initState = clone(initialState)
    const updatedSlices = {}
    Object.keys(initState).forEach(sliceName => {
      updatedSlices[sliceName] = initState[sliceName]
    })

    syntheticUpdate(updatedSlices)
  }

  addNonReactives()
  mergeSavedState()
  addReactivesToState()
  addEffects()
  addMiddlewares()

  // add preprocesses

  for (const sliceName in slices) {
    const preprocess = slices[sliceName].preprocess
    if (preprocess) {
      for (const actionType in preprocess) {
        const preprocessor = (actionData, options) => {
          const send = processedData => dispatch(actionType, processedData, { ...options, preprocessed: true })
          preprocess[actionType](actionData, send)
        }

        // if (!preprocessors[actionType]) preprocessors[actionType] = []
        preprocessors[actionType] = preprocessor
      }
    }
  }

  // save a copy of original initialState;
  const initialState = clone(state)

  return {
    dispatch,
    subscribe,
    state,
    constants,
    syntheticUpdate,
    syntheticReset,
    isValidActionType,
    componentUsage,
    addSliceUsage,
    addActionTypeUsage,
    addConstUsage
  }
}

export default xedux
