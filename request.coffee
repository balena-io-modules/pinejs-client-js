_ = require 'lodash'
request = require 'request'
Promise = require 'bluebird'
PinejsClientCore = require './core'

request = Promise.promisify(request)

module.exports = class PinejsClientRequest extends PinejsClientCore(_, Promise)
	_request: (params) ->
		# We default to gzip on for efficiency.
		params.gzip ?= true
		# The request is always a json request.
		params.json = true

		request(params).spread (response, body) ->
			if 200 <= response.statusCode < 300
				return body
			throw new Error(body)
