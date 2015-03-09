expect = require('chai').expect

_ = require 'lodash'
Promise = require 'bluebird'
PinejsClientCore = require '../core'

PinejsClientCore = PinejsClientCore(_, Promise)
core = new PinejsClientCore()
exports.test = (expected, params) ->
	expect(core.compile(params)).to.equal expected
