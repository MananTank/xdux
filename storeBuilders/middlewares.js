// if the middlewares array is [x, y, z]
// dispatch function should be modified such that
// first x middleware runs, then y, then z

const addMiddlewares = (middlewares, state, dispatch) => {
  if (middlewares && middlewares.length) {
    for (const middleware of middlewares.slice().reverse()) {
      dispatch = middleware({ dispatch, state })
    }
  }
}

export default addMiddlewares
