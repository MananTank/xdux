// this is meant only for arrays of strings
function arrayAreSame (arr1, arr2) {
  if (arr1.length !== arr2.length) return false
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false
  }
  return true
}

const hasCyclicDeps = (currentSnap, history) => {
  for (const snapshot of history) {
    if (arrayAreSame(snapshot, currentSnap)) return true
  }
  return false
}

export default hasCyclicDeps
