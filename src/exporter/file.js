'use strict'

const traverse = require('pull-traverse')
const UnixFS = require('ipfs-unixfs')
const CID = require('cids')
const pull = require('pull-stream')
const paramap = require('pull-paramap')

// Logic to export a single (possibly chunked) unixfs file.
module.exports = (node, name, pathRest, resolve, dag) => {
  function getData (node) {
    try {
      const file = UnixFS.unmarshal(node.data)
      return file.data || Buffer.alloc(0)
    } catch (err) {
      throw new Error('Failed to unmarshal node')
    }
  }

  function visitor (node) {
    return pull(
      pull.values(node.links),
      paramap((link, cb) => dag.get(new CID(link.multihash), cb)),
      pull.map((result) => result.value)
    )
  }

  const accepts = pathRest[0]

  if (accepts !== undefined && accepts !== name) {
    return pull.empty()
  }

  let content = pull(
    traverse.depthFirst(node, visitor),
    pull.map(getData)
  )

  const file = UnixFS.unmarshal(node.data)
  return pull.values([{
    content: content,
    path: name,
    hash: node.multihash,
    size: file.fileSize()
  }])
}
