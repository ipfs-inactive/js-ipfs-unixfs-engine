'use strict'

const traverse = require('pull-traverse')
const pull = require('pull-stream')
const CID = require('cids')

const util = require('./../util')
const switchType = util.switchType
const cleanMultihash = util.cleanMultihash

const dirExporter = require('./dir')
const fileExporter = require('./file')

module.exports = (hash, ipldResolver, options) => {
  try {
    hash = cleanMultihash(hash)
  } catch (err) {
    return pull.error(err)
  }

  options = options || {}

  function visitor (item) {
    return pull(
      ipldResolver.getStream(new CID(item.hash)),
      pull.map((node) => switchType(
        node,
        () => dirExporter(node, item.path, ipldResolver),
        () => fileExporter(node, item.path, ipldResolver)
      )),
      pull.flatten()
    )
  }

  // Traverse the DAG
  return pull(
    ipldResolver.getStream(new CID(hash)),
    pull.map((node) => switchType(
      node,
      () => traverse.widthFirst({path: hash, hash}, visitor),
      () => fileExporter(node, hash, ipldResolver)
    )),
    pull.flatten()
  )
}
