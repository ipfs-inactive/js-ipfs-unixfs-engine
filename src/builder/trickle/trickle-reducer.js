'use strict'

const pull = require('pull-stream')
const pullWrite = require('pull-write')
const pushable = require('pull-pushable')
const batch = require('pull-batch')
const waterfall = require('async/waterfall')

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
    function (err) {
      if (err) {
        source.emit('error', err)
      } else {
        source.end()
      }
    }
  )

  const batched = pull(
    source,
    batch(maxLeafs)
  )

  waterfall(
    [
      cb => trickleStream(batched, cb),
      reduce
    ],
    (err, root) => {
      if (err) {
        result.emit('error', err)
        return
      }
      result.push(root)
      result.end()
    }
  )

  function trickleStream (source, callback) {
    let iterations = 0
    return pull(
      source,
      pull.asyncMap((nodes, callback) => {
        iterations++
        if (iterations > options.layerRepeat) {
          iterations = 0
          trickleStream(source, function (err, moreNodes) {
            if (err) {
              callback(err)
              return // early
            }
            callback(null, nodes.concat(moreNodes))
          })
        } else {
          callback(null, nodes)
        }
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
