((root, factory) ->
	if typeof define is 'function' and define.amd
		# AMD. Register as an anonymous module.
		define ->
			return (root.PinejsClientCore = factory())
	else if typeof exports is 'object'
		# Node. Does not work with strict CommonJS, but
		# only CommonJS-like enviroments that support module.exports,
		# like Node.
		module.exports = factory()
	else
		# Browser globals
		root.PinejsClientCore = factory()
) @, ->

	# Utils must support .isString, .isObject, and .isArray
	# Promise must support Promise.reject, returning a rejected promise
	return (utils, Promise) ->
		do ->
			# Check that the objects passed in have the required properties.
			requiredMethods = ['isString', 'isNumber', 'isBoolean', 'isObject', 'isArray']
			for method in requiredMethods when !utils[method]?
				throw new Error('The utils implementation must support ' + requiredMethods.join(', '))
			if !Promise.reject?
				throw new Error('The Promise implementation must support .reject')

		isPrimitive = (value) ->
			utils.isString(value) or utils.isNumber(value) or utils.isBoolean(value) or value is null

		# Escape a resource name (string), or resource path (array)
		escapeResource = (resource) ->
			if utils.isString(resource)
				encodeURIComponent(resource)
			else if utils.isArray(resource)
				resource =
					for component in resource
						encodeURIComponent(component)
				resource.join('/')
			else
				throw new Error('Not a valid resource: ' + typeof value)

		# Escape a primitive value (string or number)
		escapeValue = (value) ->
			if utils.isString(value)
				return "'" + encodeURIComponent(value) + "'"
			else if utils.isNumber(value) or utils.isBoolean(value) or value is null
				return value
			else
				throw new Error('Not a valid value: ' + typeof value)

		join = (strOrArray, separator = ',') ->
			if utils.isString(strOrArray)
				strOrArray
			else if utils.isArray(strOrArray)
				strOrArray.join(separator)
			else
				throw new Error('Expected a string or array, got: ' + typeof strOrArray)

		# Join together a bunch of statements making sure the whole lot is correctly parenthesised
		# Force outer brackets says that the outer brackets are needed even in the case of only one element (eg a 1 param function)
		bracketJoin = (arr, separator, forceOuterBrackets = false) ->
			str = arr.join(')' + separator + '(')
			if arr.length > 1
				return '((' + str + '))'
			if forceOuterBrackets
				return '(' + str + ')'
			return str

		buildFilter = do ->
			# Add the parentKey + operator if it exists.
			addParentKey = (filter, parentKey, operator = ' eq ') ->
				if parentKey?
					return escapeResource(parentKey) + operator + filter
				return filter

			# Handle special cases for all the different $ operators.
			handleOperator = (filter, parentKey, operator) ->
				operator = operator[1...]
				switch operator
					when 'ne', 'eq', 'gt', 'ge', 'lt', 'le', 'add', 'sub', 'mul', 'div', 'mod'
						operator = ' ' + operator + ' '
						if isPrimitive(filter)
							filter = escapeValue(filter)
							addParentKey(filter, parentKey, operator)
						else if utils.isArray(filter)
							filter = handleArray(filter)
							filter = bracketJoin(filter, operator)
							addParentKey(filter, parentKey)
						else if utils.isObject(filter)
							result = handleObject(filter)
							if result.length < 2
								throw new Error("#{operator} objects must have at least 2 properties as an object, got: #{JSON.stringify(filter)}")
							filter = bracketJoin(result, operator)
							addParentKey(filter, parentKey)
						else
							throw new Error('Expected null/string/number/bool/obj/array, got: ' + typeof filter)
					when 'contains', 'endswith', 'startswith', 'endswith', 'endswith', 'length', 'indexof', 'substring', 'tolower', 'toupper', 'trim', 'concat', 'year', 'month', 'day', 'hour', 'minute', 'second', 'fractionalseconds', 'date', 'time', 'totaloffsetminutes', 'now', 'maxdatetime', 'mindatetime', 'totalseconds', 'round', 'floor', 'ceiling', 'isof', 'cast'
						if isPrimitive(filter)
							operands = []
							if parentKey?
								operands.push(escapeResource(parentKey))
							operands.push(escapeValue(filter))
							operator + '(' + operands.join() + ')'
						else if utils.isArray(filter)
							filter = handleArray(filter)
							filter = bracketJoin(filter, ',', true)
							filter = operator + filter
							addParentKey(filter, parentKey)
						else if utils.isObject(filter)
							result = handleObject(filter)
							filter = bracketJoin(result, ',', true)
							filter = operator + filter
							addParentKey(filter, parentKey)
						else
							throw new Error('Expected null/string/number/obj/array, got: ' + typeof filter)
					when 'raw'
						addParentKey(filter, parentKey)
					when ''
						filter = escapeResource(filter)
						addParentKey(filter, parentKey)
					when 'and', 'or'
						filter = buildFilter(filter, null, " #{operator} ")
						addParentKey(filter, parentKey)
					when 'in'
						operator = " #{operator} "
						if isPrimitive(filter)
							filter = escapeValue(filter)
							addParentKey(filter, parentKey, ' eq ')
						else if utils.isArray(filter)
							filter = handleArray(filter, parentKey)
							filter = bracketJoin(filter, ' or ')
						else if utils.isObject(filter)
							result = handleObject(filter, parentKey)
							if result.length < 1
								throw new Error("#{operator} objects must have at least 1 property as an object, got: #{JSON.stringify(filter)}")
							filter = bracketJoin(result, ' or ')
						else
							throw new Error('Expected null/string/number/bool/obj/array, got: ' + typeof filter)
					when 'not'
						filter = 'not(' + buildFilter(filter) + ')'
						addParentKey(filter, parentKey)
					else
						throw new Error('Unrecognised operator: ' + operator)

			handleObject = (filter, parentKey) ->
				for own key, value of filter
					if key[0] is '$'
						handleOperator(value, parentKey, key)
					else
						key = [key]
						if parentKey?
							key = parentKey.concat(key)
						buildFilter(value, key)

			handleArray = (filter, parentKey) ->
				if filter.length < 2
					throw new Error("Filter arrays must have at least 2 elements, got: #{JSON.stringify(filter)}")

				for value in filter
					buildFilter(value, parentKey)

			# Turn a filter query object into an OData $filter string
			return (filter, parentKey, joinStr) ->
				if isPrimitive(filter)
					filter = escapeValue(filter)
					addParentKey(filter, parentKey)
				else if utils.isArray(filter)
					filter = handleArray(filter)
					filter = bracketJoin(filter, joinStr ? ' or ')
					addParentKey(filter, parentKey)
				else if utils.isObject(filter)
					filter = handleObject(filter, parentKey)
					bracketJoin(filter, joinStr ? ' and ')
				else
					throw new Error('Expected null/string/number/obj/array, got: ' + typeof filter)

		buildExpand = do ->
			handleObject = (expand, parentKey) ->
				expandOptions = []
				expands = []
				for own key, value of expand
					if key[0] is '$'
						if parentKey.length is 0
							throw new Error('Cannot have expand options without first expanding something!')
						value =
							switch key
								when '$filter'
									buildFilter(value)
								else
									join(value)
						expandOptions.push("#{key}=#{value}")
						
					else
						key = parentKey.concat(key)
						expands.push(buildExpand(value, key))
				if expandOptions.length > 0
					expandOptions = expandOptions.join('&')
					expandOptions = escapeResource(parentKey) + "(#{expandOptions})"
					expands.push(expandOptions)
				return expands

			handleArray = (expand, parentKey) ->
				if expand.length < 1
					throw new Error("Expand arrays must have at least 1 elements, got: #{JSON.stringify(expand)}")

				for value in expand
					buildExpand(value, parentKey)

			return (expand, parentKey = []) ->
				if isPrimitive(expand)
					escapeResource(parentKey.concat(expand))
				else if utils.isArray(expand)
					expand = handleArray(expand, parentKey)
					expand = join(expand)
				else if utils.isObject(expand)
					expand = handleObject(expand, parentKey)
					join(expand)

		# PinejsClientCore should be subclassed by a class that provides the following functions:
		# _request: ({method, url, body}) -> return Promise

		validParams = [
			'apiPrefix'
			'passthrough'
			'passthroughByMethod'
		]

		return class PinejsClientCore

			apiPrefix: '/'
			passthrough: {}
			passthroughByMethod: {}
			constructor: (params) ->
				if utils.isString(params)
					params = {apiPrefix: params}

				for validParam in validParams when params[validParam]?
					@[validParam] = params[validParam]

			clone: (params) ->
				if utils.isString(params)
					params = {apiPrefix: params}

				cloneParams = {}
				for validParam in validParams
					if @[validParam]?
						cloneParams[validParam] = @[validParam]
					if params[validParam]?
						cloneParams[validParam] = params[validParam]

				new @constructor(cloneParams)

			query: (params) ->
				@get(params)

			get: (params) ->
				singular = utils.isObject(params) and params.id?
				return @request(params, method: 'GET').then (data) ->
					if !data?.d?
						throw new Error('Invalid response received.')
					if singular
						if data.d.length > 1
							throw new Error('Returned multiple results when only one was expected.')
						return data.d[0]
					return data.d

			put: (params) ->
				return @request(params, method: 'PUT')

			patch: (params) ->
				return @request(params, method: 'PATCH')

			post: (params) ->
				return @request(params, method: 'POST')

			delete: (params) ->
				return @request(params, method: 'DELETE')

			request: (params, overrides = {}) ->
				try
					{ method, url, body, passthrough } = params
					passthrough ?= {}

					if utils.isString(params)
						url = params
						method = 'GET'
					else if !url?
						if !params.resource?
							throw new Error('Either the url or resource must be specified.')
						url = params.resource

						if params.id?
							url += '(' + escapeValue(params.id) + ')'

						queryOptions = []
						if params.options?
							for own option, value of params.options
								value =
									switch option
										when 'filter'
											buildFilter(value)
										when 'expand'
											buildExpand(value)
										else
											join(value)
								queryOptions.push("$#{option}=" + value)
						if params.customOptions?
							for own option, value of params.customOptions
								queryOptions.push(option + '=' + value)
						if queryOptions.length > 0
							url += '?' + queryOptions.join('&')

					apiPrefix = params.apiPrefix ? @apiPrefix
					url = apiPrefix + url

					method = method ? overrides.method ? 'GET'
					method = method.toUpperCase()
					# Filter to prevent accidental parameter passthrough.
					mergeObjs = [
						@passthrough
						@passthroughByMethod[method] ? {}
						passthrough ? {}
						{ method, url, body }
						overrides
					]
					opts = {}
					for obj in mergeObjs
						for own option, value of obj
							opts[option] = value
					opts.method = method

					return @_request(opts)
				catch e
					return Promise.reject(e)
