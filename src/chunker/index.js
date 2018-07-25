'use strict'

const rabin = require('rabin')

const chunkers = {
  fixed: require('../chunker/fixed-size')
}

// Don't include the rabin chunker when rabin require is null for browser
if (rabin) {
  chunkers.rabin = require('../chunker/rabin')
}

module.exports = chunkers
