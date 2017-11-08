/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const BlockService = require('ipfs-block-service')
const IPLDResolver = require('ipld-resolver')
const pull = require('pull-stream')

const unixFSEngine = require('./../')
const exporter = unixFSEngine.exporter

const strategies = [
  'flat',
  'balanced',
  'trickle'
]

function fileEql (f1, f2, done) {
  pull(
    f1.content,
    pull.collect((err, data) => {
      if (err) {
        return done(err)
      }

      try {
        if (f2) {
          expect(Buffer.concat(data)).to.eql(f2)
        } else {
          expect(data).to.exist()
        }
      } catch (err) {
        return done(err)
      }
      done()
    })
  )
}

function reduceLength (acc, chunk) {
  return acc + chunk.length
}

module.exports = (repo) => {
  const bigFile = Buffer.alloc(5000000, 'a')

  strategies.forEach((strategy) => {
    const importerOptions = { strategy: strategy }

    describe('import and export with builder: ' + strategy, () => {
      let ipldResolver

      before(() => {
        const bs = new BlockService(repo)
        ipldResolver = new IPLDResolver(bs)
      })

      // TODO fix pull-block https://github.com/dignifiedquire/pull-block/pull/10
      it('import and export', (done) => {
        const path = strategy + '-big.dat'
        pull(
          pull.values([{
            path: path,
            content: pull.values(bigFile)
          }]),
          unixFSEngine.importer(ipldResolver, importerOptions),
          pull.map((file) => {
            expect(file.path).to.eql(path)

            return exporter(file.multihash, ipldResolver)
          }),
          pull.flatten(),
          pull.collect((err, files) => {
            expect(err).to.not.exist()
            expect(files[0].size).to.be.eql(bigFile.reduce(reduceLength, 0))
            fileEql(files[0], Buffer.concat(bigFile), done)
          })
        )
      })
    })
  })
}
