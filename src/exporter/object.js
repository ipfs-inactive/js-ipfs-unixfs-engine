'use strict'

const CID = require('cids')
const pull = require('pull-stream')

module.exports = (node, name, pathRest, resolve, dag, parent) => {
  let newNode
  if (pathRest.length) {
    const pathElem = pathRest[0]
    newNode = node[pathElem]
    const newName = name + '/' + pathElem
    if (!newNode) {
      return pull.error('not found')
    }
    const isCID = CID.isCID(newNode)
    return pull(
      pull.values([{
        path: newName,
        pathRest: pathRest.slice(1),
        multihash: isCID && newNode,
        object: !isCID && newNode,
        parent: parent
      }]),
      resolve)
  } else {
    return pull.error(new Error('invalid node type'))
  }
}

function sanitizeCID (cid) {
  return new CID(cid.version, cid.codec, cid.multihash)
}
