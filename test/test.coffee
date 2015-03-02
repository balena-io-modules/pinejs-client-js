expect = require('chai').expect

_ = require 'lodash'
Promise = require 'bluebird'
PinejsClientCore = require '../core'

exports.PinejsClientTest = class PinejsClientTest extends PinejsClientCore(_, Promise)
	constructor: ({expected}) ->
		super
		@_request = (params) ->
			expect(params.url).to.equal expected
			return Promise.resolve(d:[])
