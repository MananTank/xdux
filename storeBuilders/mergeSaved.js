const mergeSavedState = (savedState, mutateState) => {
  if (savedState) {
    for (const sliceName in savedState) {
      mutateState(sliceName, savedState[sliceName])
    }
  }
}

export default mergeSavedState
