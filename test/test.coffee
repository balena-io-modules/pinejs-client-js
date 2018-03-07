expect = require('chai').expect

_ = require 'lodash'
Promise = require 'bluebird'
{ PinejsClientCoreFactory } = require '../core'

PinejsClientCore = PinejsClientCoreFactory(_, Promise)
core = new PinejsClientCore()
exports.test = (expected, params) ->
	if _.isError(expected)
		expect(-> core.compile(params)).to.throw(expected.constructor, expected.message)
	else
		expect(core.compile(params)).to.equal expected
