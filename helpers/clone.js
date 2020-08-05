// a cloning algorithm specially written for xedux
const simpleDeepClone = (x) => {
  // simple value type
  if (typeof x !== 'object') return x

  // array
  if (Array.isArray(x)) {
    const xClone = []
    x.forEach((value) => {
      xClone.push(simpleDeepClone(value))
    })

    return xClone
  }

  // object
  if (typeof x === 'object') {
    const xClone = {}
    for (const key in x) {
      xClone[key] = simpleDeepClone(x[key])
    }

    return xClone
  }

  return null // error
}

export default simpleDeepClone
