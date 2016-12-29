/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const pull = require('pull-stream')

const builder = require('../src/builder/trickle')

function reduce (leaves, callback) {
  if (leaves.length > 1) {
    callback(null, leaves)
  } else {
    callback(null, leaves[0])
  }
}

const options = {
  maxChildrenPerNode: 5,
  layerRepeat: 2
}

describe('trickle builder', () => {
  it('reduces one value into itself', callback => {
    pull(
      pull.values([1]),
      builder(reduce, options),
      pull.collect((err, result) => {
        expect(err).to.not.exist
        expect(result).to.be.eql([1])
        callback()
      })
    )
  })

  it('reduces 3 values into parent', callback => {
    pull(
      pull.values([1, 2, 3]),
      builder(reduce, options),
      pull.collect((err, result) => {
        expect(err).to.not.exist
        expect(result).to.be.eql([
          [
            1,
            2,
            3
          ]
        ])
        callback()
      })
    )
  })

  it('forms correct trickle tree', callback => {
    pull(
      pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]),
      builder(reduce, options),
      pull.collect((err, result) => {
        expect(err).to.not.exist
        expect(result).to.be.eql([
          [
            [
              1,
              2,
              3
            ],
            [
              4,
              5,
              6
            ],
            [
              7,
              8,
              9,
              [
                10,
                11,
                12
              ],
              [
                13,
                14,
                15
              ],
              [
                16,
                17,
                18,
                19
              ]
            ]
          ]
        ])
        callback()
      })
    )
  })
})
