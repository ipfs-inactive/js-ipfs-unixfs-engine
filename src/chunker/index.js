'use strict'

const rabin = require('rabin')

const chunkers = {
  fixed: require('../chunker/fixed-size'),
  rabin: require('../chunker/rabin')
}

module.exports = chunkers
