/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const BlockService = require('ipfs-block-service')
const IPLDResolver = require('ipld-resolver')
const UnixFS = require('ipfs-unixfs')
const bs58 = require('bs58')
const pull = require('pull-stream')
const zip = require('pull-zip')
const CID = require('cids')
const loadFixture = require('aegir/fixtures')
const Buffer = require('safe-buffer').Buffer

const unixFSEngine = require('./../src')
const exporter = unixFSEngine.exporter

const smallFile = loadFixture(__dirname, 'fixtures/200Bytes.txt')

module.exports = (repo) => {
  describe('exporter', () => {
    let ipldResolver

    before(() => {
      const bs = new BlockService(repo)
      ipldResolver = new IPLDResolver(bs)
    })


    it('export a file 2 levels down', (done) => {
      const hash = 'QmWChcSFMNcFkfeJtNd8Yru1rE6PhtCRfewi1tMwjkwKjN/level-1/200Bytes.txt'

      pull(
        exporter(hash, ipldResolver),
        pull.collect((err, files) => {
          expect(err).to.not.exist()
          expect(files.length).to.equal(3)
          expect(files[0].path).to.equal('QmWChcSFMNcFkfeJtNd8Yru1rE6PhtCRfewi1tMwjkwKjN')
          expect(files[0].content).to.not.exist()
          expect(files[1].path).to.equal('QmWChcSFMNcFkfeJtNd8Yru1rE6PhtCRfewi1tMwjkwKjN/level-1')
          expect(files[1].content).to.not.exist()
          expect(files[2].path).to.equal('QmWChcSFMNcFkfeJtNd8Yru1rE6PhtCRfewi1tMwjkwKjN/level-1/200Bytes.txt')
          fileEql(files[2], smallFile, done)
        })
      )
    })

    it('export a non existing file', (done) => {
      const hash = 'QmWChcSFMNcFkfeJtNd8Yru1rE6PhtCRfewi1tMwjkwKjN/doesnotexist'

      pull(
        exporter(hash, ipldResolver),
        pull.collect((err, files) => {
          expect(err).to.not.exist()
          expect(files.length).to.equal(1)
          expect(files[0].path).to.equal('QmWChcSFMNcFkfeJtNd8Yru1rE6PhtCRfewi1tMwjkwKjN')
          expect(files[0].content).to.not.exist()
          done()
        })
      )
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
