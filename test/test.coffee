expect = require('chai').expect

_ = require 'lodash'
Promise = require 'bluebird'
mimemessage = require 'mimemessage'

PinejsClientCore = require '../core'

PinejsClientCore = PinejsClientCore(_, Promise, mimemessage)
core = new PinejsClientCore()
exports.test = (expected, params) ->
	if _.isError(expected)
		expect(-> core.compile(params)).to.throw(expected.constructor, expected.message)
	else
		expect(core.compile(params)).to.equal expected

exports.testBatch = (expected, params) ->
	_.forEach core.compileBatch(params).body, (entity, index) ->
		if _.isString(entity.body)
			checkEntity(expected[index], entity)
		else
			_.forEach entity.body, (CSentity, CSindex) ->
				checkEntity(expected[index][CSindex], CSentity)

exports.compile = (params) -> return core.compile(params)

checkEntity = (expectation, entity) ->
	for key, value of expectation
		if key is 'body' then expect(entity.body).to.equal(value)
		else expect(entity.header(key)).to.equal(value)
