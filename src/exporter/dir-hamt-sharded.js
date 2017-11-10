'use strict'

const pull = require('pull-stream')
const cat = require('pull-cat')
const cleanHash = require('./clean-multihash')

// Logic to export a unixfs directory.
module.exports = shardedDirExporter

function shardedDirExporter (node, path, pathRest, resolve, dag, parent) {
  let dir
  if (!parent || parent.path !== path) {
    dir = [{
      path: path,
      hash: cleanHash(node.multihash)
    }]
  }

  const streams = [
    pull(
      pull.values(node.links),
      pull.map((link) => {
        // remove the link prefix (2 chars for the bucket index)
        const p = link.name.substring(2)
        const pp = p ? path + '/' + p : path
        let accept = true
        let fromPathRest = false

        if (p && pathRest.length) {
          fromPathRest = true
          accept = (p === pathRest[0])
        }
        if (accept) {
          return {
            fromPathRest: fromPathRest,
            name: p,
            path: pp,
            multihash: link.multihash,
            pathRest: p ? pathRest.slice(1) : pathRest,
            parent: (dir && dir[0]) || parent
          }
        } else {
          return ''
        }
      }),
      pull.filter(Boolean),
      resolve
    )
  ]

  if (!pathRest.length) {
    streams.unshift(pull.values(dir))
  }

  return cat(streams)
}
