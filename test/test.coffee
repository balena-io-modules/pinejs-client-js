expect = require('chai').expect

_ = require 'lodash'
{ PinejsClientCore } = require '..'

core = new PinejsClientCore()
exports.test = (expected, params) ->
	if _.isError(expected)
		expect(-> core.compile(params)).to.throw(expected.constructor, expected.message)
	else
		expect(core.compile(params)).to.equal expected

exports.buildMochaHelper = (mochaFn, runExpectation) ->
	ret = runExpectation.bind(null, mochaFn)
	ret.skip = runExpectation.bind(null, mochaFn.skip)
	ret.only = runExpectation.bind(null, mochaFn.only)
	return ret
