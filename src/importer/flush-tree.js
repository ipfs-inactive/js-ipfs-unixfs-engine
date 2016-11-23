'use strict'

const mh = require('multihashes')
const UnixFS = require('ipfs-unixfs')
const CID = require('cids')
const dagPB = require('ipld-dag-pb')
const mapValues = require('async/mapValues')
const series = require('async/series')
const each = require('async/each')

const DAGLink = dagPB.DAGLink
const DAGNode = dagPB.DAGNode

module.exports = (files, ipldResolver, source, callback) => {
  // 1) convert files to a tree
  const fileTree = createTree(files)

  if (Object.keys(fileTree).length === 0) {
    return callback()// no dirs to be created
  }

  // 2) create sizeIndex
  const sizeIndex = createSizeIndex(files)

  // 3) bottom up flushing
  traverse(fileTree, sizeIndex, null, ipldResolver, source, callback)
}

/*
 * createTree
 *
 * received an array of files with the format:
 * {
 *    path: // full path
 *    multihash: // multihash of the dagNode
 *    size: // cumulative size
 * }
 *
 * returns a JSON object that represents a tree where branches are the paths
 * and the leaves are objects with file names and respective multihashes, such
 * as:
 *   {
 *     foo: {
 *       bar: {
 *         baz.txt: <multihash>
 *       }
 *     }
 *   }
 */
function createTree (files) {
  const fileTree = {}

  files.forEach((file) => {
    let splitted = file.path.split('/')
    if (splitted.length === 1) {
      return // adding just one file
    }
    if (splitted[0] === '') {
      splitted = splitted.slice(1)
    }
    var tmpTree = fileTree

    for (var i = 0; i < splitted.length; i++) {
      if (!tmpTree[splitted[i]]) {
        tmpTree[splitted[i]] = {}
      }
      if (i === splitted.length - 1) {
        tmpTree[splitted[i]] = file.multihash
      } else {
        tmpTree = tmpTree[splitted[i]]
      }
    }
  })

  return fileTree
}

/*
 * create a size index that goes like:
 * { <multihash>: <size> }
 */
function createSizeIndex (files) {
  const sizeIndex = {}

  files.forEach((file) => {
    sizeIndex[mh.toB58String(file.multihash)] = file.size
  })

  return sizeIndex
}

/*
 * expand the branches recursively (depth first), flush them first
 * and then traverse through the bottoum up, flushing everynode
 *
 * Algorithm tl;dr;
 *  create a dirNode
 *  Object.keys
 *    If the value is an Object
 *      create a dir Node
 *      Object.keys
 *    Once finished, add the result as a link to the dir node
 *  If the value is not an object
 *    add as a link to the dirNode
 */
function traverse (tree, sizeIndex, path, ipldResolver, source, done) {
  mapValues(tree, (node, key, cb) => {
    if (isLeaf(node)) {
      return cb(null, node)
    }

    traverse(node, sizeIndex, path ? `${path}/${key}` : key, ipldResolver, source, cb)
  }, (err, tree) => {
    if (err) {
      return done(err)
    }

    // at this stage, all keys are multihashes
    // create a dir node
    // add all the multihashes as links
    // return this new node multihash

    const keys = Object.keys(tree)

    let n

    series([
      (cb) => {
        const d = new UnixFS('directory')
        DAGNode.create(d.marshal(), (err, node) => {
          if (err) {
            return cb(err)
          }
          n = node
          cb()
        })
      },
      (cb) => {
        each(keys, (key, next) => {
          const b58mh = mh.toB58String(tree[key])
          const link = new DAGLink(key, sizeIndex[b58mh], tree[key])

          DAGNode.addLink(n, link, (err, node) => {
            if (err) {
              return next(err)
            }
            n = node
            next()
          })
        }, cb)
      },
      (cb) => {
        sizeIndex[mh.toB58String(n.multihash)] = n.size

        ipldResolver.put({
          node: n,
          cid: new CID(n.multihash)
        }, (err) => {
          if (err) {
            source.push(new Error('failed to store dirNode'))
            return cb(err)
          }
          if (path) {
            source.push({
              path: path,
              multihash: n.multihash,
              size: n.size
            })
          }
          cb()
        })
      }
    ], (err) => {
      if (err) {
        return done(err)
      }
      done(null, n.multihash)
    })
  })
}

function isLeaf (value) {
  return !(typeof value === 'object' && !Buffer.isBuffer(value))
}
