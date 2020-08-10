const addEffects = (effects, state, actionProcessor, dispatch) => {
  for (const actionType in effects) {
    const effect = effects[actionType]
    const effectProcessor = actionData => effect(dispatch, state, actionData)
    if (actionProcessor[actionType] === undefined) {
      actionProcessor[actionType] = []
    }
    actionProcessor[actionType].push(effectProcessor)
  }
}

export default addEffects
