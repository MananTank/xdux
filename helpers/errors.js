export const NO_INIT_VALUE_ERROR = (sliceName) => {
  throw new Error(`slice "${sliceName}" is missing initialState`)
}

export const NO_REACTOR = (sliceName) => {
  throw new Error(`slice "${sliceName}" is missing reactor function`)
}

export const CYCLIC_DEPENDENCY_ERROR = (sliceNames) => {
  throw new Error(
    `ERROR: Cyclic Dependancy found involving slices: ${sliceNames}.` +
    '\nCheck the deps array of these slices and remove cyclic dependancy'
  )
}

export const INVALID_DEP_ERROR = (dep, sliceName) => {
  throw new Error(
    `invalid dependancy "${dep}" added in "${sliceName}". \nNo such slice exists in store.`
  )
}

export const CAN_NOT_RETURN_UNDEFINED = (sliceName) => {
  throw new Error(
    `reactor of "${sliceName}" slice is returning undefined.` +
    '\nreactor must return a value. If you are returning undefined explicity in reactor(), this is not allowed.' +
    '\nconsider returning other falsy values'
  )
}
