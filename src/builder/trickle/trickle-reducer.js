'use strict'

const assert = require('assert')
const pull = require('pull-stream')
const pullWrite = require('pull-write')
const pushable = require('pull-pushable')
const batch = require('pull-batch')

module.exports = function trickleReduceToRoot (reduce, options) {
  const maxLeafs = options.maxChildrenPerNode - options.layerRepeat
  const source = pushable()
  const result = pushable()

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

  trickleStream(source, function (err, roots) {
    if (err) {
      result.emit('error', err)
    } else {
      assert.equal(roots.length, 1, 'need exactly one root')
      const root = roots[0]
      // console.log('replying root', JSON.stringify(root, null, '  '))
      result.push(root)
      result.end()
    }
  })

  function trickleStream (source, callback) {
    return pull(
      source,
      batch(maxLeafs),
      pull.asyncMap((leafs, callback) => {
        pull(
          source,
          batch(options.layerRepeat),
          trickleStream(source, (err, roots) => {
            if (err) {
              callback(err)
            } else {
              callback(null, leafs.concat(roots))
            }
          }),
          pull.asyncMap(reduce)
        )
      }),
      pull.asyncMap(reduce),
      pull.collect(callback)
    )
  }

  return {
    sink: sink,
    source: result
  }
}
