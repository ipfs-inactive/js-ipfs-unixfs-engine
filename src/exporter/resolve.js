'use strict'

const UnixFS = require('ipfs-unixfs')
const pull = require('pull-stream')

const resolvers = {
  directory: require('./dir-flat'),
  'hamt-sharded-directory': require('./dir-hamt-sharded'),
  file: require('./file'),
  unknown: require('./unknown')
}

module.exports = Object.assign({
  resolve: resolve,
  typeOf: typeOf
}, resolvers)

function resolve (node, hash, pathRest, ipldResolver, parentNode) {
  let type
  try {
    type = typeOf(node)
  } catch (err) {
    type = 'unknown'
  }
  const resolver = resolvers[type]
  if (!resolver) {
    return pull.error(new Error('Unkown node type ' + type))
  }
  return resolver(node, hash, pathRest, ipldResolver, resolve, parentNode)
}

function typeOf (node) {
  const data = UnixFS.unmarshal(node.data)
  return data.type
}
