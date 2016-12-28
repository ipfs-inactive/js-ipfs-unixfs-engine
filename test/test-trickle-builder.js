/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const pull = require('pull-stream')

const builder = require('../src/builder/trickle')

function reduce (leaves, callback) {
  if (leaves.length > 1) {
    callback(null, { children: leaves })
  } else {
    callback(null, leaves[0])
  }
}

const options = {
  maxChildrenPerNode: 4,
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
        expect(result).to.be.eql([{
          children: [1, 2, 3]
        }])
        callback()
      })
    )
  })

  it('forms correct trickle tree', callback => {
    pull(
      pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      builder(reduce, options),
      pull.collect((err, result) => {
        expect(err).to.not.exist
        expect(result).to.be.eql([
          {
            children: [
              1,
              2,
              {
                children: [
                  3,
                  4,
                  {
                    children: [
                      5,
                      6,
                      {
                        children: [
                          7,
                          8,
                          {
                            children: [
                              9,
                              10
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ])
        callback()
      })
    )
  })
})
