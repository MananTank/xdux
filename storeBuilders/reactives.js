
import { CAN_NOT_RETURN_UNDEFINED, NO_REACTOR, INVALID_DEP_ERROR, CYCLIC_DEPENDENCY_ERROR } from '../helpers/errors'
import shallowEqual from '../helpers/shallowEqual'
import clone from '../helpers/clone'
import hasCyclicDeps from '../helpers/cyclicDeps'
import { produce } from 'immer'

const addReactives = (state, slices, reactives, mutateState, mutation, notifyDependentsOfSlice, pendingReactives, constants) => {
  const callReactor = sliceName => {
    const depStates = slices[sliceName].deps.map(dep => state[dep])
    return produce(depStates, draft => {
      return slices[sliceName].reactor(...draft, constants)
    })
  }

  const addReactiveProcessor = sliceName => {
    const handleDepsChange = () => {
      const oldState = state[sliceName]
      const newState = callReactor(sliceName)
      if (newState === undefined) CAN_NOT_RETURN_UNDEFINED(sliceName)
      if (!shallowEqual(oldState, newState)) {
        mutateState(sliceName, clone(newState))
        mutation.updatedSlices[sliceName] = { oldState, newState }
        notifyDependentsOfSlice(sliceName)
      }
    }

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
    if (!slice.reactor) NO_REACTOR(sliceName)

    let success = true // sucess, if the reactive's initial could be calculated right away

    for (const dep of slice.deps) {
      if (!slices[dep]) INVALID_DEP_ERROR(dep, sliceName)

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
      pendingReactives.shift() // remove this sliceName from pending, because it's value is now resolved
      addReactiveProcessor(sliceName)
    }

    if (hasCyclicDeps(pendingReactives, pendingReactivesHistory)) {
      CYCLIC_DEPENDENCY_ERROR(pendingReactives)
    }

    pendingReactivesHistory.push([...pendingReactives])
  } // while end ---
}

export default addReactives
