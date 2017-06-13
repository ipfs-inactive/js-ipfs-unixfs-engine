'use strict'

const path = require('path')
const pull = require('pull-stream')
const paramap = require('pull-paramap')
const CID = require('cids')
const cat = require('pull-cat')
const cleanHash = require('./clean-multihash')

// Logic to export a unixfs directory.
module.exports = shardedDirExporter

function shardedDirExporter (node, name, pathRest, ipldResolver, resolve, parent) {
  let dir
  if (!parent || parent.path !== name) {
    dir = [{
      path: name,
      hash: cleanHash(node.multihash)
    }]
  }

  return cat([
    pull.values(dir),
    pull(
      pull.values(node.links),
      pull.map((link) => {
        // remove the link prefix (2 chars for the bucket index)
        const p = link.name.substring(2)
        const pp = p ? path.join(name, p) : name
        let accept = true

        if (p && pathRest.length) {
          accept = (p === pathRest[0])
        }
        if (accept) {
          return {
            name: p,
            path: pp,
            hash: link.multihash,
            pathRest: p ? pathRest.slice(1) : pathRest
          }
        } else {
          return ''
        }
      }),
      pull.filter(Boolean),
      paramap((item, cb) => ipldResolver.get(new CID(item.hash), (err, n) => {
        if (err) {
          return cb(err)
        }

        cb(null, resolve(n.value, item.path, item.pathRest, ipldResolver, (dir && dir[0]) || parent))
      })),
      pull.flatten()
    )
  ])
}
