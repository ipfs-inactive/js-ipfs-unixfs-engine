'use strict'

const depthFirstReducer = require('./depth-first-reducer')

const defaultOptions = {
  maxLinksPerNode: 172,
  layerRepeat: 4
}

module.exports = function (reduce, _options) {
  const options = Object.assign({}, defaultOptions, _options)
  return depthFirstReducer(reduce, options)
}
