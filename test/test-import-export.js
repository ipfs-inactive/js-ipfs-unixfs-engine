/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const IPLDResolver = require('ipld-resolver')
const pull = require('pull-stream')
const loadFixture = require('aegir/fixtures')

const unixFSEngine = require('./../')
const exporter = unixFSEngine.exporter

const bigFile = loadFixture(__dirname, 'fixtures/1.2MiB.txt')

const strategies = [
  'flat',
  'balanced',
  'trickle'
]

module.exports = (repo) => {
  strategies.forEach((strategy) => {
    const importerOptions = {
      strategy: strategy,
      maxChildrenPerNode: 10,
      layerRepeat: 2,
      chunkerOptions: {
        maxChunkSize: 1024
      }
    }

    describe('import export using ' + strategy + ' builder strategy', () => {
      let ipldResolver

      before(() => {
        const bs = new BlockService(repo)
        ipldResolver = new IPLDResolver(bs)
      })

      it('import and export', (done) => {
        const path = strategy + '-1.2MiB.txt'
        pull(
          pull.values([{
            path: path,
            content: pull.values([
              bigFile,
              Buffer('hello world')
            ])
          }]),
          unixFSEngine.importer(ipldResolver, importerOptions),
          pull.map((file) => {
            expect(file.path).to.be.eql(path)

            return exporter(file.multihash, ipldResolver)
          }),
          pull.flatten(),
          pull.collect((err, files) => {
            expect(err).to.not.exist
            expect(files[0].size).to.be.eql(bigFile.length + 11)
            fileEql(files[0], Buffer.concat([bigFile, Buffer('hello world')]), done)
          })
        )
      })
    })
  })
}

function fileEql (f1, f2, done) {
  pull(
    f1.content,
    pull.collect((err, data) => {
      if (err) {
        return done(err)
      }

      try {
        if (f2) {
          expect(Buffer.concat(data)).to.be.eql(f2)
        } else {
          expect(data).to.exist
        }
      } catch (err) {
        return done(err)
      }
      done()
    })
  )
}
