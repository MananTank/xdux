
import { NO_REACTOR, INVALID_DEP_ERROR, CYCLIC_DEPENDENCY_ERROR } from '../utils/errors'
import hasCyclicDeps from '../utils/cyclicDeps'

// get reactive slices as initial slices that are not resolved
// to resolve means to figure out its initial value
// to resolve initial values all of its deps values must be resolved first
// since a reactive slice can have another reactive slice as its dependency, that one has to be resolved first

const addReactives = (state, mutateState, callReactor, slices, dependents) => {
  const unresolvedSlices = Object.keys(slices).filter(sliceName => slices[sliceName].deps)

  // this is for detecting cyclic dependencies, such as a -> b -> c -> a
  const shiftHistory = [[...unresolvedSlices]]

  while (unresolvedSlices.length) {
    // pick first slice, check if it's deps are resolved, if yes, resolve it
    // if no, shift the slice to end of array to resolve it later
    const sliceName = unresolvedSlices[0]
    const slice = slices[sliceName]
    if (!slice.reactor) NO_REACTOR(sliceName)

    // assume it is resolvable
    let resolvable = true

    // check if any of its dep is unresolved, it is - set resolvable to false, shift the slice to end of array
    for (const dep of slice.deps) {
      if (!(dep in slices)) INVALID_DEP_ERROR(dep, sliceName)

      if (!(dep in state)) {
        unresolvedSlices.shift()
        unresolvedSlices.push(sliceName)
        resolvable = false
        break
      }
    }

    // if resolvable, resolve the initial value by calling its reactor with deps initial values
    if (resolvable) {
      mutateState(sliceName, callReactor(sliceName))

      // add resolved value to state
      for (const dep of slices[sliceName].deps) {
        if (dependents[dep] === undefined) dependents[dep] = []
        dependents[dep].push(sliceName)
      }

      unresolvedSlices.shift() // now that it is resolved, remove it from unresolved array
    }

    // if history repeats itself, we can cyclic deps - and it can not be resolved
    if (hasCyclicDeps(unresolvedSlices, shiftHistory)) {
      CYCLIC_DEPENDENCY_ERROR(unresolvedSlices)
    }

    shiftHistory.push([...unresolvedSlices])
  }
}

export default addReactives
