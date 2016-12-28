'use strict'

const assert = require('assert')
const pull = require('pull-stream')
const pullWrite = require('pull-write')
const pushable = require('pull-pushable')
const batch = require('pull-batch')

module.exports = function balancedReduceToRoot (reduce, options) {
  const source = pushable()

  const sink = pullWrite(
    function (item, cb) {
      source.push(item)
      cb()
    },
    null,
    1,
    function (end) {
      source.end(end)
    }
  )

  const result = pushable()

  reduceToParents(source, function (err, roots) {
    if (err) {
      result.emit('error', err)
      return // early
    }
    assert.equal(roots.length, 1, 'no root')
    result.push(roots[0])
    result.end()
  })

  function reduceToParents (_chunks, callback) {
    let chunks = _chunks
    if (Array.isArray(chunks)) {
      chunks = pull.values(chunks)
    }

    pull(
      chunks,
      batch(options.maxChildrenPerNode),
      pull.asyncMap(reduce),
      pull.collect(reduced)
    )

    function reduced (err, roots) {
      if (err) {
        callback(err)
      } else if (roots.length > 1) {
        reduceToParents(roots, callback)
      } else {
        callback(null, roots)
      }
    }
  }

  return {
    sink: sink,
    source: result
  }
}
