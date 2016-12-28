'use strict'

const pull = require('pull-stream')
const pushable = require('pull-pushable')
const pullWrite = require('pull-write')
const batch = require('pull-batch')

module.exports = function (reduce, options) {
  const source = pushable()
  const sink = pullWrite(
    function (d, cb) {
      source.push(d)
      cb()
    },
    null,
    1,
    function (err) {
      if (err) {
        source.emit('error', err)
      } else {
        source.end()
      }
    }
  )

  const result = pushable()

  pull(
    source,
    batch(Infinity),
    pull.asyncMap(reduce),
    pull.collect(function (err, roots) {
      if (err) {
        result.emit('error', err)
        return // early
      }
      result.push(roots[0])
      result.end()
    })
  )

  return {
    sink: sink,
    source: result
  }
}
