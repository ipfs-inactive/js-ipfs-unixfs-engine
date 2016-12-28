'use strict'

const pullBlock = require('pull-block')

module.exports = (options) => {
  let size = (typeof options === 'number') ? options : options.chunkSize
  return pullBlock(size, { zeroPadding: false })
}
