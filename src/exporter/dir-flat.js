'use strict'

const pull = require('pull-stream')
const cat = require('pull-cat')

// Logic to export a unixfs directory.
module.exports = dirExporter

function dirExporter (node, path, pathRest, resolve) {
  const accepts = pathRest[0]

  const dir = {
    path: path,
    hash: node.multihash
  }

  const streams = [
    pull(
      pull.values(node.links),
      pull.map((link) => ({
        size: link.size,
        name: link.name,
        path: path + '/' + link.name,
        multihash: link.multihash,
        linkName: link.name,
        pathRest: pathRest.slice(1)
      })),
      pull.filter((item) => accepts === undefined || item.linkName === accepts),
      resolve
    )
  ]

  // place dir before if not specifying subtree
  if (!pathRest.length) {
    streams.unshift(pull.values([dir]))
  }

  return cat(streams)
}
