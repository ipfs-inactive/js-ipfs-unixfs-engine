/* eslint-env mocha */
/* global self */
'use strict'

const expect = require('chai').expect
const engine = require('../')

describe('unixfs-engine', () => {
  it('should export the exporter', () => {
    expect(engine.exporter).to.be.a('function')
  })

  it('should export the exporter as a class', () => {
    expect(engine.Exporter).to.be.a('function')
  })

  it('should export the importer', () => {
    expect(engine.importer).to.be.a('function')
  })

  it('should export the importer as a class', () => {
    expect(engine.Importer).to.be.a('function')
  })
})
