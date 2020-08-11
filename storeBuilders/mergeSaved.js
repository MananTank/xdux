// override state with stuff in savedState
// if there is new data, add them to state
const mergeSavedState = (savedState, mutateState) => {
  if (savedState) {
    for (const sliceName in savedState) {
      mutateState(sliceName, savedState[sliceName])
    }
  }
}

export default mergeSavedState
