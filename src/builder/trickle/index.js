'use strict'

const trickleReducer = require('./trickle-reducer')

const defaultOptions = {
  maxChildrenPerNode: 172,
  layerRepeat: 4
}

module.exports = function (reduce, _options) {
  const options = Object.assign({}, defaultOptions, _options)
  return trickleReducer(reduce, options)
}
