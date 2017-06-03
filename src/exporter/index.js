'use strict'

const pull = require('pull-stream')
const CID = require('cids')
const v = require('is-ipfs')
const pullDefer = require('pull-defer')

const resolve = require('./resolve').resolve

function sanitize (path) {
  // Buffer -> raw multihash or CID in buffer
  if (Buffer.isBuffer(path)) {
    return new CID(path).toBaseEncodedString()
  }

  if (CID.isCID(path)) {
    return path.toBaseEncodedString()
  }

  try {
    const cid = new CID(path)
    return cid.toBaseEncodedString()
  } catch (err) {} // not an isolated CID, can be a path

  if (v.ipfsPath(path)) {
    // trim that ipfs prefix
    if (path.indexOf('/ipfs/') === 0) {
      path = path.substring(6)
    }

    return path
  } else {
    throw new Error('not valid cid or path')
  }
}

module.exports = (path, dag) => {
  try {
    path = sanitize(path)
  } catch (err) {
    return pull.error(err)
  }

  const d = pullDefer.source()

  const cid = new CID(path)

  dag.get(cid, (err, node) => {
    if (err) {
      return pull.error(err)
    }
    d.resolve(pull.values([node]))
  })

  return pull(
    d,
    pull.map((result) => result.value),
    pull.map((node) => resolve(node, path, dag)),
    pull.flatten()
  )
}
