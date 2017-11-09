'use strict'

const UnixFS = require('ipfs-unixfs')
const pull = require('pull-stream')
const paramap = require('pull-paramap')
const CID = require('cids')

const resolvers = {
  directory: require('./dir-flat'),
  'hamt-sharded-directory': require('./dir-hamt-sharded'),
  file: require('./file'),
  object: require('./object')
}

module.exports = Object.assign({
  createResolver: createResolver,
  typeOf: typeOf
}, resolvers)

function createResolver (dag, options, depth, parent) {
  if (! depth) {
    depth = 0
  }

  if (!options.recurse && depth > 0) {
    return pull.map(identity)
  }

  return pull(
    paramap((item, cb) => {
      if (item.object) {
        return cb(null, resolve(item.object, item.path, item.pathRest, dag, item.parent || parent))
      }
      dag.get(new CID(item.multihash), (err, node) => {
        if (err) {
          return cb(err)
        }
        const name = item.fromPathRest ? item.name : item.path
        cb(null, resolve(node.value, name, item.pathRest, dag, item.parent || parent))
      })
    }),
    pull.flatten()
  )

  function resolve (node, hash, pathRest, parentNode) {
    const type = typeOf(node)
    const nodeResolver = resolvers[type]
    if (!nodeResolver) {
      return pull.error(new Error('Unkown node type ' + type))
    }
    const resolveDeep = createResolver(dag, options, depth + 1, node)
    return nodeResolver(node, hash, pathRest, resolveDeep, dag, parentNode)
  }
}

function typeOf (node) {
  if (Buffer.isBuffer(node.data)) {
    return UnixFS.unmarshal(node.data).type
  } else {
    return 'object'
  }
}

function identity (o) {
  return o
}
