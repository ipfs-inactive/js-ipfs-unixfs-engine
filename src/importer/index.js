'use strict'

const UnixFS = require('ipfs-unixfs')
const assert = require('assert')
const pull = require('pull-stream')
const pullPushable = require('pull-pushable')
const pullWrite = require('pull-write')
const parallel = require('async/parallel')
const dagPB = require('ipld-dag-pb')
const CID = require('cids')
const series = require('async/series')
const each = require('async/each')

const fsc = require('./../chunker/fixed-size')
const createAndStoreTree = require('./flush-tree')

const DAGNode = dagPB.DAGNode

const CHUNK_SIZE = 262144

module.exports = (ipldResolver, options) => {
  assert(ipldResolver, 'Missing IPLD Resolver')

  const files = []

  const source = pullPushable()

  const sink = pullWrite(
    makeWriter(source, files, ipldResolver),
    null,
    100,
    (err) => {
      if (err) {
        return source.end(err)
      }

      createAndStoreTree(files, ipldResolver, source, () => {
        source.end()
      })
    }
  )

  return {
    source: source,
    sink: sink
  }
}

function makeWriter (source, files, ipldResolver) {
  return (items, cb) => {
    parallel(items.map((item) => (cb) => {
      if (!item.content) {
        return createAndStoreDir(item, ipldResolver, (err, node) => {
          if (err) {
            return cb(err)
          }
          source.push(node)
          files.push(node)
          cb()
        })
      }

      createAndStoreFile(item, ipldResolver, (err, node) => {
        if (err) {
          return cb(err)
        }
        source.push(node)
        files.push(node)
        cb()
      })
    }), cb)
  }
}

function createAndStoreDir (item, ipldResolver, callback) {
  // 1. create the empty dir dag node
  // 2. write it to the dag store

  const d = new UnixFS('directory')
  let n

  series([
    (cb) => {
      DAGNode.create(d.marshal(), (err, node) => {
        if (err) {
          return cb(err)
        }
        n = node
        cb()
      })
    },
    (cb) => {
      ipldResolver.put({
        node: n,
        cid: new CID(n.multihash)
      }, cb)
    }
  ], (err) => {
    if (err) {
      return callback(err)
    }
    callback(null, {
      path: item.path,
      multihash: n.multihash,
      size: n.size
    })
  })
}

function createAndStoreFile (file, ipldResolver, callback) {
  if (Buffer.isBuffer(file.content)) {
    file.content = pull.values([file.content])
  }

  if (typeof file.content !== 'function') {
    return callback(new Error('invalid content'))
  }

  // 1. create the unixfs merkledag node
  // 2. add its hash and size to the leafs array

  // TODO - Support really large files
  // a) check if we already reach max chunks if yes
  // a.1) create a parent node for all of the current leaves
  // b.2) clean up the leaves array and add just the parent node

  pull(
    file.content,
    fsc(CHUNK_SIZE),
    pull.asyncMap((chunk, cb) => {
      const l = new UnixFS('file', new Buffer(chunk))

      DAGNode.create(l.marshal(), (err, node) => {
        if (err) {
          return cb(err)
        }

        ipldResolver.put({
          node: node,
          cid: new CID(node.multihash)
        }, (err) => {
          if (err) {
            return cb(err)
          }

          cb(null, {
            Hash: node.multihash,
            Size: node.size,
            leafSize: l.fileSize(),
            Name: ''
          })
        })
      })
    }),
    pull.collect((err, leaves) => {
      if (err) {
        return callback(err)
      }

      if (leaves.length === 1) {
        return callback(null, {
          path: file.path,
          multihash: leaves[0].Hash,
          size: leaves[0].Size
        })
      }

      // create a parent node and add all the leafs

      const f = new UnixFS('file')
      let n

      series([
        (cb) => {
          DAGNode.create(f.marshal(), (err, node) => {
            if (err) {
              return cb(err)
            }
            n = node
            cb()
          })
        },
        (cb) => {
          each(leaves, (leaf, next) => {
            f.addBlockSize(leaf.leafSize)
            DAGNode.addLink(n, {
              name: leaf.Name,
              size: leaf.Size,
              multihash: leaf.Hash
            }, (err, node) => {
              if (err) {
                return next(err)
              }
              n = node
              next()
            })
          }, cb)
        },
        (cb) => {
          ipldResolver.put({
            node: n,
            cid: new CID(n.multihash)
          }, cb)
        }
      ], (err) => {
        if (err) {
          return callback(err)
        }

        callback(null, {
          path: file.path,
          multihash: n.multihash,
          size: n.size
        })
      })
    })
  )
}
