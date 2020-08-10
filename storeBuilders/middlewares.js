
const addMiddlewares = (middlewares, state, dispatch) => {
  if (middlewares && middlewares.length) {
    for (const middleware of middlewares.slice().reverse()) {
      dispatch = middleware({ dispatch, state })
    }
  }
}

export default addMiddlewares
