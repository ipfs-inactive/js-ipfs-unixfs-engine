/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const BlockService = require('ipfs-block-service')
const pull = require('pull-stream')
const mh = require('multihashes')
const IPLDResolver = require('ipld-resolver')
const eachSeries = require('async').eachSeries
const createBuilder = require('../src/builder')
const FixedSizeChunker = require('../src/chunker/fixed-size')

module.exports = (repo) => {
  describe('builder', () => {
    let ipldResolver

    before(() => {
      const bs = new BlockService(repo)
      ipldResolver = new IPLDResolver(bs)
    })

    it('allows multihash hash algorithm to be specified', (done) => {
      eachSeries(Object.keys(mh.names), (hashAlg, cb) => {
        const options = { hashAlg, strategy: 'flat' }
        const content = String(Math.random() + Date.now())

        pull(
          pull.values([{
            path: content + '.txt',
            content: Buffer.from(content)
          }]),
          createBuilder(FixedSizeChunker, ipldResolver, options),
          pull.collect((err, nodes) => {
            expect(err).to.not.exist()
            expect(nodes.length).to.equal(1)
            expect(mh.decode(nodes[0].multihash).name).to.equal(hashAlg)
            cb(err)
          })
        )
      }, done)
    })
  })
}
