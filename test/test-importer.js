/* eslint-env mocha */
'use strict'

const importer = require('./../src').importer

const extend = require('deep-extend')
const expect = require('chai').expect
const BlockService = require('ipfs-block-service')
const pull = require('pull-stream')
const mh = require('multihashes')
const IPLDResolver = require('ipld-resolver')
const loadFixture = require('aegir/fixtures')

function stringifyMh (files) {
  return files.map((file) => {
    file.multihash = mh.toB58String(file.multihash)
    return file
  })
}

const bigFile = loadFixture(__dirname, 'fixtures/1.2MiB.txt')
const smallFile = loadFixture(__dirname, 'fixtures/200Bytes.txt')

const baseFiles = {
  '200Bytes.txt': {
    path: '200Bytes.txt',
    multihash: 'QmZU6acAmfBHBa4esfNfSH9G9Sx1h49KGpqYzPvXjTCWFe',
    size: 264,
    name: '',
    leafSize: 200
  },
  '1.2MiB.txt': {
    path: '1.2MiB.txt',
    multihash: 'QmbPN6CXXWpejfQgnRYnMQcVYkFHEntHWqLNQjbkatYCh1',
    size: 1328062,
    name: '',
    leafSize: 1258000
  }
}

const strategyBaseFiles = {
  flat: baseFiles,
  balanced: extend({}, baseFiles, {
    '1.2MiB.txt': {
      multihash: 'QmeEGqUisUD2T6zU96PrZnCkHfXCGuQeGWKu4UoSuaZL3d',
      size: 1335420
    }
  }),
  trickle: extend({}, baseFiles, {
    '1.2MiB.txt': {
      multihash: 'QmaiSohNUt1rBf2Lqz6ou54NHVPTbXbBoPuq9td4ekcBx4',
      size: 1334599
    }
  })
}

const strategies = [
  'flat',
  'balanced',
  'trickle'
]

const strategyOverrides = {
  balanced: {
    'foo-big': {
      path: 'foo-big',
      multihash: 'QmQ1S6eEamaf4t948etp8QiYQ9avrKCogiJnPRgNkVreLv',
      size: 1335478
    },
    pim: {
      multihash: 'QmSxR2CPcJqE3WVV9rT4mn7ZB3F3NwyyLUABBFb8MZRABf',
      size: 1335797
    },
    'pam/pum': {
      multihash: 'QmSxR2CPcJqE3WVV9rT4mn7ZB3F3NwyyLUABBFb8MZRABf',
      size: 1335797
    },
    pam: {
      multihash: 'QmdQaTo7JUZ1otkpnLuRdmL75PZUUDovVBxEU3XzKCKsJt',
      size: 2671322
    }
  },
  trickle: {
    'foo-big': {
      path: 'foo-big',
      multihash: 'QmPh6KSS7ghTqzgWhaoCiLoHFPF7HGqUxx7q9vcM5HUN4U',
      size: 1334657
    },
    pim: {
      multihash: 'QmYHiiqpWySwPS4zRCv4976baa9epk2VYY6GaAEWhEboZu',
      size: 1334976
    },
    'pam/pum': {
      multihash: 'QmYHiiqpWySwPS4zRCv4976baa9epk2VYY6GaAEWhEboZu',
      size: 1334976
    },
    pam: {
      multihash: 'QmTWpcXJD4mph83PgXnEGqNXGxM3JgADM2hZmYtWpscCj7',
      size: 2669680
    }
  }

}

module.exports = (repo) => {
  strategies.forEach(strategy => {
    const baseFiles = strategyBaseFiles[strategy]
    const defaultResults = extend({}, baseFiles, {
      'foo/bar/200Bytes.txt': extend({}, baseFiles['200Bytes.txt'], {
        path: 'foo/bar/200Bytes.txt'
      }),
      foo: {
        path: 'foo',
        multihash: 'QmZcDXF22anrX3vBbDxMThN5BVCpkrg1KAAXhzdJ6S7g6G',
        size: 373
      },
      'foo/bar': {
        path: 'foo/bar',
        multihash: 'QmQE64CC7KR8uL75WLAXXtZ9Ms1ZXDM9ptaqGbpLfGog52',
        size: 323
      },
      'foo-big/1.2MiB.txt': extend({}, baseFiles['1.2MiB.txt'], {
        path: 'foo-big/1.2MiB.txt'
      }),
      'foo-big': {
        path: 'foo-big',
        multihash: 'Qma6JU3FoXU9eAzgomtmYPjzFBwVc2rRbECQpmHFiA98CJ',
        size: 1328120
      },
      'pim/200Bytes.txt': extend({}, baseFiles['200Bytes.txt'], {
        path: 'pim/200Bytes.txt'
      }),
      'pim/1.2MiB.txt': extend({}, baseFiles['1.2MiB.txt'], {
        path: 'pim/1.2MiB.txt'
      }),
      pim: {
        path: 'pim',
        multihash: 'QmZ8gnWwvoyYXd4S1WsnQSKP7MhLhnJkEotEnxgkenyaib',
        size: 1328439
      },
      'empty-dir': {
        path: 'empty-dir',
        multihash: 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn',
        size: 4
      },
      'pam/pum': {
        multihash: 'QmZ8gnWwvoyYXd4S1WsnQSKP7MhLhnJkEotEnxgkenyaib',
        size: 1328439
      },
      pam: {
        multihash: 'QmZ4veCEhzr9wPekpfHvYisK1BqaYJJ4pHf2uwGdYgrsYG',
        size: 2656606
      }
    }, strategyOverrides[strategy])

    const expected = extend({}, defaultResults, strategies[strategy])
    describe(strategy + ' importer', () => {
      let ipldResolver

      const options = {
        strategy: strategy,
        maxChildrenPerNode: 10,
        chunkerOptions: {
          maxChunkSize: 1024
        }
      }

      before(() => {
        const bs = new BlockService(repo)
        ipldResolver = new IPLDResolver(bs)
      })

      it('fails on bad input', (done) => {
        pull(
          pull.values([{
            path: '200Bytes.txt',
            content: 'banana'
          }]),
          importer(ipldResolver, options),
          pull.onEnd((err) => {
            expect(err).to.exist
            done()
          })
        )
      })

      it('fails on more than one root', (done) => {
        pull(
          pull.values([
            {
              path: '/beep/200Bytes.txt',
              content: pull.values([smallFile])
            },
            {
              path: '/boop/200Bytes.txt',
              content: pull.values([smallFile])
            }
          ]),
          importer(ipldResolver, options),
          pull.onEnd((err) => {
            expect(err).to.exist
            expect(err.message).to.be.eql('detected more than one root')
            done()
          })
        )
      })

      it('small file (smaller than a chunk)', (done) => {
        pull(
          pull.values([{
            path: '200Bytes.txt',
            content: pull.values([smallFile])
          }]),
          importer(ipldResolver, options),
          pull.collect((err, files) => {
            expect(err).to.not.exist
            expect(stringifyMh(files)).to.be.eql([expected['200Bytes.txt']])
            done()
          })
        )
      })

      it('small file as buffer (smaller than a chunk)', (done) => {
        pull(
          pull.values([{
            path: '200Bytes.txt',
            content: smallFile
          }]),
          importer(ipldResolver, options),
          pull.collect((err, files) => {
            expect(err).to.not.exist
            expect(stringifyMh(files)).to.be.eql([expected['200Bytes.txt']])
            done()
          })
        )
      })

      it('small file (smaller than a chunk) inside a dir', (done) => {
        pull(
          pull.values([{
            path: 'foo/bar/200Bytes.txt',
            content: pull.values([smallFile])
          }]),
          importer(ipldResolver, options),
          pull.collect(collected)
        )

        function collected (err, files) {
          expect(err).to.not.exist
          expect(files.length).to.equal(3)
          stringifyMh(files).forEach((file) => {
            if (file.path === 'foo/bar/200Bytes.txt') {
              expect(file).to.be.eql(expected['foo/bar/200Bytes.txt'])
            }
            if (file.path === 'foo') {
              expect(file).to.be.eql(expected.foo)
            }
            if (file.path === 'foo/bar') {
              expect(file).to.be.eql(expected['foo/bar'])
            }
          })
          done()
        }
      })

      it('file bigger than a single chunk', (done) => {
        pull(
          pull.values([{
            path: '1.2MiB.txt',
            content: pull.values([bigFile])
          }]),
          importer(ipldResolver, options),
          pull.collect((err, files) => {
            expect(err).to.not.exist
            expect(stringifyMh(files)).to.be.eql([expected['1.2MiB.txt']])
            done()
          })
        )
      })

      it('file bigger than a single chunk inside a dir', (done) => {
        pull(
          pull.values([{
            path: 'foo-big/1.2MiB.txt',
            content: pull.values([bigFile])
          }]),
          importer(ipldResolver, options),
          pull.collect((err, files) => {
            expect(err).to.not.exist

            expect(stringifyMh(files)).to.be.eql([
              expected['foo-big/1.2MiB.txt'],
              expected['foo-big']
            ])

            done()
          })
        )
      })

      it('empty directory', (done) => {
        pull(
          pull.values([{
            path: 'empty-dir'
          }]),
          importer(ipldResolver, options),
          pull.collect((err, files) => {
            expect(err).to.not.exist

            expect(stringifyMh(files)).to.be.eql([expected['empty-dir']])

            done()
          })
        )
      })

      it('directory with files', (done) => {
        pull(
          pull.values([{
            path: 'pim/200Bytes.txt',
            content: pull.values([smallFile])
          }, {
            path: 'pim/1.2MiB.txt',
            content: pull.values([bigFile])
          }]),
          importer(ipldResolver, options),
          pull.collect((err, files) => {
            expect(err).to.not.exist

            expect(stringifyMh(files)).be.eql([
              expected['pim/200Bytes.txt'],
              expected['pim/1.2MiB.txt'],
              expected.pim]
            )

            done()
          })
        )
      })

      it('nested directory (2 levels deep)', (done) => {
        pull(
          pull.values([{
            path: 'pam/pum/200Bytes.txt',
            content: pull.values([smallFile])
          }, {
            path: 'pam/pum/1.2MiB.txt',
            content: pull.values([bigFile])
          }, {
            path: 'pam/1.2MiB.txt',
            content: pull.values([bigFile])
          }]),
          importer(ipldResolver, options),
          pull.collect((err, files) => {
            expect(err).to.not.exist

            // need to sort as due to parallel storage the order
            // can vary
            stringifyMh(files).forEach(eachFile)

            done()
          })
        )

        function eachFile (file) {
          if (file.path === 'pam/pum/200Bytes.txt') {
            expect(file.multihash).to.be.eql(expected['200Bytes.txt'].multihash)
            expect(file.size).to.be.eql(expected['200Bytes.txt'].size)
          }
          if (file.path === 'pam/pum/1.2MiB.txt') {
            expect(file.multihash).to.be.eql(expected['1.2MiB.txt'].multihash)
            expect(file.size).to.be.eql(expected['1.2MiB.txt'].size)
          }
          if (file.path === 'pam/pum') {
            const dir = expected['pam/pum']
            expect(file.multihash).to.be.eql(dir.multihash)
            expect(file.size).to.be.eql(dir.size)
          }
          if (file.path === 'pam/1.2MiB.txt') {
            expect(file.multihash).to.be.eql(expected['1.2MiB.txt'].multihash)
            expect(file.size).to.be.eql(expected['1.2MiB.txt'].size)
          }
          if (file.path === 'pam') {
            const dir = expected.pam
            expect(file.multihash).to.be.eql(dir.multihash)
            expect(file.size).to.be.eql(dir.size)
          }
        }
      })
    })
  })
}
