'use strict'

const path = require('path')
const CID = require('cids')
const pull = require('pull-stream')
const pullDefer = require('pull-defer')

// Logic to export a single (possibly chunked) unixfs file.
module.exports = (node, name, pathRest, ipldResolver, resolve) => {
  let newNode
  if (pathRest.length) {
    const pathElem = pathRest.shift()
    newNode = node[pathElem]
    const newName = path.join(name, pathElem)
    if (CID.isCID(newNode)) {
      const d = pullDefer.source()
      ipldResolver.get(sanitizeCID(newNode), (err, newNode) => {
        if (err) {
          d.resolve(pull.error(err))
        } else {
          d.resolve(resolve(newNode.value, newName, pathRest, ipldResolver, node))
        }
      })
      return d
    } else if (newNode !== undefined) {
      return resolve(newNode, newName, pathRest, ipldResolver, node)
    } else {
      return pull.error('not found')
    }
  }
}

function sanitizeCID (cid) {
  return new CID(cid.version, cid.codec, cid.multihash)
}
