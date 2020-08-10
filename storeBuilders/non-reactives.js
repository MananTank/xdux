import { CAN_NOT_RETURN_UNDEFINED, NO_INIT_VALUE_ERROR } from '../helpers/errors'
import shallowEqual from '../helpers/shallowEqual'
import { produce } from 'immer'

const addNonReactives = (slices, state, mutateState, mutation, notifyDependentsOfSlice, constants, actionProcessor, pendingReactives) => {
  const createProcessor = (sliceName, reducer) => actionData => {
    const oldState = state[sliceName]
    // immer mutative update support
    const newState = produce(oldState, draft => reducer(draft, actionData, constants))
    console.log('new: ', newState, 'oldState:', oldState)

    if (newState === undefined) CAN_NOT_RETURN_UNDEFINED(reducer.name)
    if (!shallowEqual(oldState, newState)) {
      mutateState(sliceName, newState)
      mutation.updatedSlices[sliceName] = { newState, oldState }
      notifyDependentsOfSlice(sliceName)
    }
  }

  const addProcessors = sliceName => {
    const { reducers } = slices[sliceName]
    for (const reducerName in reducers) {
      const action = sliceName + '/' + reducerName
      const reducer = reducers[reducerName]
      actionProcessor[action] = createProcessor(sliceName, reducer, reducerName)
    }
  }

  for (const sliceName in slices) {
    const slice = slices[sliceName]
    if (slice.deps) {
      pendingReactives.push(sliceName)
    } else {
      if (!('initialState' in slice)) NO_INIT_VALUE_ERROR(sliceName)
      mutateState(sliceName, slice.initialState)
      addProcessors(sliceName)
    }
  }
}

export default addNonReactives
