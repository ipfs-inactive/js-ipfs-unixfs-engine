'use strict'

const assert = require('assert')
const pull = require('pull-stream')
const pullWrite = require('pull-write')
const pushable = require('pull-pushable')
const batch = require('pull-batch')
const through = require('pull-through')

module.exports = function depthFirstReduceToRoot (reduce, options) {
  const result = pushable()
  const refeed = pushable()

  let paused = false
  let buffer
  let cb

  const sink = pullWrite(
    function (items, _cb) { // write
      if (paused) {
        buffer = items
        cb = _cb
      } else {
        refeed.push(items)
        _cb()
      }
    },
    null, // reduce
    1, // max
    function (err) {
      refeed.end(err)
    }
  )

  function pause () {
    paused = true
  }

  function resume () {
    paused = false
    if (buffer) {
      const _cb = cb
      const _buffer = buffer
      buffer = null
      cb = null
      refeed.push(_buffer)
      _cb()
    }
  }

  let root

  pull(
    refeed,
    batch(options.maxChildrenPerNode),
    through(
      function (items) {
        if (items.length > 1) {
          pause()
          reduce(items, function (err, parent) {
            if (err) {
              this.queue(err)
            } else {
              root = parent
              refeed.push(root)
            }

            resume()
          })
        } else {
          this.queue(items[0])
        }
      },
      function (end) {
        if (root) {
          this.queue(root)
        }
        this.queue(null)
      }
    ),
    pull.collect(function (err, roots) {
      if (err) {
        result.emit('error', err)
      } else {
        assert.equal(roots.length, 1, 'need one root')
        result.push(roots[0])
        result.end()
      }
    })
  )

  return {
    source: result,
    sink: sink
  }
}
