const addPreprocessors = (preprocessors, slices, dispatch) => {
  for (const sliceName in slices) {
    const preprocess = slices[sliceName].preprocess
    if (preprocess) {
      for (const reducerName in preprocess) {
        const action = sliceName + '/' + reducerName
        const preprocessor = (actionData, options) => {
          const send = processedData => dispatch(action, processedData, { ...options, preprocessed: true })
          preprocess[reducerName](actionData, send)
        }
        preprocessors[action] = preprocessor
      }
    }
  }
}

export default addPreprocessors
