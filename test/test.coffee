expect = require('chai').expect

_ = require 'lodash'
{ PinejsClientCoreFactory } = require '..'

PinejsClientCore = PinejsClientCoreFactory(Promise)
core = new PinejsClientCore()
exports.test = (expected, params) ->
	if _.isError(expected)
		expect(-> core.compile(params)).to.throw(expected.constructor, expected.message)
	else
		expect(core.compile(params)).to.equal expected
