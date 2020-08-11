// a preprocessor takes payload
// defines a send funciton
// calls the preprocess function for an action with payload and send

// send function takes preprocessed payload and calls the dispatch with that preprocessed payload

const addPreprocessors = (preprocessors, slices, dispatch) => {
  for (const sliceName in slices) {
    const preprocess = slices[sliceName].preprocess
    if (preprocess) {
      for (const reducerName in preprocess) {
        const action = sliceName + '/' + reducerName
        const preprocessor = (payload, options) => {
          const send = processedPayload => dispatch(action, processedPayload, { ...options, preprocessed: true })
          preprocess[reducerName](payload, send)
        }
        preprocessors[action] = preprocessor
      }
    }
  }
}

export default addPreprocessors
