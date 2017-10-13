const noop = () => {}
const deprecated: {
	[ index: string ]: () => void
} = {}
const addDeprecated = (name: string, message: string) => {
	deprecated[name] = () => {
		console.warn('pinejs-client deprecated:', message)
		deprecated[name] = noop
	}
}
addDeprecated(
	'expandObject',
	'`$expand: a: b: ...` is deprecated, please use `$expand: a: $expand: b: ...` instead.'
)
addDeprecated(
	'expandPrimitive',
	'`$expand: a: "b"` is deprecated, please use `$expand: a: $expand: "b"` instead.'
)
addDeprecated(
	'expandFilter',
	'`$filter: a: b: ...` is deprecated, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.'
)
addDeprecated(
	'implicitOptions',
	'Options without $ prefixes (e.g. `options: filter: ...`) are deprecated, please use a $ prefix (eg `options: $filter: ...`).'
)

function defaults <T>(a: T | undefined, b: T | undefined, z: T): T
function defaults <T>(a: T | undefined, z: T): T
function defaults <T>(...args: (T | undefined)[]): T | undefined {
	for (const arg of args) {
		if (arg != null) {
			return arg
		}
	}
	return
}
const map = <T, R>(arr: T[], fn: (value: T) => R): R[] => {
	const results = []
	for (const key of arr) {
		results.push(fn(key))
	}
	return results
}
const mapObj = <T, R>(obj: {[index: string]: T}, fn: (value: T, key: string) => R): R[] => {
	const results = []
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			results.push(fn(obj[key], key))
		}
	}
	return results
}

const requiredUtilMethods = ['isString', 'isNumber', 'isBoolean', 'isObject', 'isArray', 'isDate']
const isUtil = (obj: any): obj is PinejsClientCoreFactory.Util => {
	if (obj == null) {
		return false
	}
	for (const method of requiredUtilMethods) {
		if (obj[method] == null) {
			return false
		}
	}
	return true
}
const isPromiseRejector = (obj: any): obj is PinejsClientCoreFactory.PromiseRejector => {
	return obj != null && obj.reject != null
}
const isValidOption = (key: string): key is keyof PinejsClientCoreFactory.ODataOptions => {
	return key === '$filter' ||
		key === '$expand' ||
		key === '$orderby' ||
		key === '$top' ||
		key === '$skip' ||
		key === '$select'
}

function PinejsClientCoreFactory(utils: PinejsClientCoreFactory.Util, Promise: PinejsClientCoreFactory.PromiseRejector) {
	if(!isUtil(utils)) {
		throw new Error('The utils implementation must support ' + requiredUtilMethods.join(', '))
	}
	if (!isPromiseRejector(Promise)) {
		throw new Error('The Promise implementation must support .reject')
	}

	const isPrimitive = (value?: any): value is string | number | boolean | Date => {
		return value === null || utils.isString(value) || utils.isNumber(value) || utils.isBoolean(value) || utils.isDate(value)
	}

	// Escape a resource name (string), or resource path (array)
	const escapeResource = (resource: string | string[]) => {
		if (utils.isString(resource)) {
			return encodeURIComponent(resource)
		} else if (utils.isArray(resource)) {
			return map(resource, encodeURIComponent).join('/')
		} else {
			throw new Error('Not a valid resource: ' + typeof resource)
		}
	}

	// Escape a primitive value
	const escapeValue = (value: null | string | number | boolean | Date) => {
		if (utils.isString(value)) {
			value = value.replace(/'/g, "''")
			return `'${encodeURIComponent(value)}'`
		} else if (utils.isDate(value)) {
			return `datetime'${value.toISOString()}'`
		} else if (value === null || utils.isNumber(value) || utils.isBoolean(value)) {
			return value
		} else {
			throw new Error('Not a valid value: ' + typeof value)
		}
	}

	const join = (strOrArray: string | string[], separator = ',') => {
		if (utils.isString(strOrArray)) {
			return strOrArray
		} else if (utils.isArray(strOrArray)) {
			return strOrArray.join(separator)
		} else {
			throw new Error('Expected a string or array, got: ' + typeof strOrArray)
		}
	}

	// Join together a bunch of statements making sure the whole lot is correctly parenthesised
	// `forceOuterBrackets` forces the outer brackets to be included when there is only one element (eg a 1 param function)
	const bracketJoin = (arr: string[], separator: string, forceOuterBrackets = false) => {
		const str = arr.join(`)${separator}(`)
		if (arr.length > 1) {
			return `((${str}))`
		}
		if (forceOuterBrackets) {
			return `(${str})`
		}
		return str
	}

	// Add the parentKey + operator if (it exists.) {
	const addParentKey = (filter: string | boolean | number | null, parentKey?: string[], operator = ' eq ') => {
		if (parentKey != null) {
			return escapeResource(parentKey) + operator + filter
		}
		return `${filter}`
	}

	const applyBinds = (filter: PinejsClientCoreFactory.FilterString, params: {[index: string]: PinejsClientCoreFactory.Filter}, parentKey?: string[]) => {
		for (const index in params) {
			const param = params[index]
			let paramStr = `(${buildFilter(param)})`
			// Escape $ for filter.replace
			paramStr = paramStr.replace(/\$/g, '$$$$')
			filter = filter.replace(new RegExp(`\\$${index}([^a-zA-Z0-9]|$)`, 'g'), `${paramStr}$1`)
		}
		return addParentKey(filter, parentKey)
	}

	const filterOperation = (filter: PinejsClientCoreFactory.FilterOperationValue, operator: PinejsClientCoreFactory.FilterOperationKey, parentKey?: string[]) => {
		const op = ' ' + operator.slice(1) + ' '
		if (isPrimitive(filter)) {
			const filterStr = escapeValue(filter)
			return addParentKey(filterStr, parentKey, op)
		} else if (utils.isArray(filter)) {
			const filterArr = handleFilterArray(filter)
			const filterStr = bracketJoin(filterArr, op)
			return addParentKey(filterStr, parentKey)
		} else if (utils.isObject(filter)) {
			const result = handleFilterObject(filter)
			if (result.length < 1) {
				throw new Error(`${operator} objects must have at least 1 property, got: ${JSON.stringify(filter)}`)
			}
			if (result.length === 1) {
				return addParentKey(result[0], parentKey, op)
			} else {
				const filterStr = bracketJoin(result, op)
				return addParentKey(filterStr, parentKey)
			}
		} else {
			throw new Error('Expected null/string/number/bool/obj/array, got: ' + typeof filter)
		}
	}
	const filterFunction = (
		filter: PinejsClientCoreFactory.FilterFunctionValue,
		fnIdentifier: PinejsClientCoreFactory.FilterFunctionKey,
		parentKey?: string[]
	) => {
		const fnName = fnIdentifier.slice(1)
		if (isPrimitive(filter)) {
			const operands = []
			if (parentKey != null) {
				operands.push(escapeResource(parentKey))
			}
			operands.push(escapeValue(filter))
			return `${fnName}(${operands.join()})`
		} else if (utils.isArray(filter)) {
			const filterArr = handleFilterArray(filter)
			let filterStr = bracketJoin(filterArr, ',', true)
			filterStr = fnName + filterStr
			return addParentKey(filterStr, parentKey)
		} else if (utils.isObject(filter)) {
			const filterArr = handleFilterObject(filter)
			let filterStr = bracketJoin(filterArr, ',', true)
			filterStr = fnName + filterStr
			return addParentKey(filterStr, parentKey)
		} else {
			throw new Error(`Expected null/string/number/obj/array, got: ${typeof filter}`)
		}
	}

	// Handle special cases for all the different $ operators.
	const handleFilterOperator = (filter: PinejsClientCoreFactory.Filter, operator: keyof PinejsClientCoreFactory.FilterObj, parentKey?: string[]): string => {
		switch (operator) {
			case '$ne':
			case '$eq':
			case '$gt':
			case '$ge':
			case '$lt':
			case '$le':
			case '$add':
			case '$sub':
			case '$mul':
			case '$div':
			case '$mod':
				return filterOperation(filter, operator, parentKey)
			// break
			case '$contains':
			case '$endswith':
			case '$startswith':
			case '$length':
			case '$indexof':
			case '$substring':
			case '$tolower':
			case '$toupper':
			case '$trim':
			case '$concat':
			case '$year':
			case '$month':
			case '$day':
			case '$hour':
			case '$minute':
			case '$second':
			case '$fractionalseconds':
			case '$date':
			case '$time':
			case '$totaloffsetminutes':
			case '$now':
			case '$maxdatetime':
			case '$mindatetime':
			case '$totalseconds':
			case '$round':
			case '$floor':
			case '$ceiling':
			case '$isof':
			case '$cast':
				return filterFunction(filter, operator, parentKey)
			// break
			case '$raw': {
				if (utils.isString(filter)) {
					return addParentKey(filter, parentKey)
				} else if (utils.isArray(filter)) {
					const [ rawFilter, ...params ] = filter
					if (!utils.isString(rawFilter)) {
						throw new Error(`First element of array for ${operator} must be a string, got: ${typeof rawFilter}`)
					}
					const mappedParams: {[index: string]: PinejsClientCoreFactory.Filter} = {}
					for (var index = 0; index < params.length; index++) {
						mappedParams[index + 1] = params[index]
					}
					return applyBinds(rawFilter, mappedParams, parentKey)
				} else if (utils.isObject(filter)) {
					const params = filter
					const filterStr = filter.$string
					if (!utils.isString(filterStr)) {
						throw new Error(`$string element of object for ${operator} must be a string, got: ${typeof filterStr}`)
					}
					const mappedParams: {[index: string]: PinejsClientCoreFactory.Filter} = {}
					for (const index in params) {
						if (index !== '$string') {
							if (!/^[a-zA-Z0-9]+$/.test(index)) {
								throw new Error(`${operator} param names must contain only [a-zA-Z0-9], got: ${index}`)
							}
							mappedParams[index] = params[index] as PinejsClientCoreFactory.Filter
						}
					}
					return applyBinds(filterStr, mappedParams, parentKey)
				} else {
					throw new Error(`Expected string/array/object for ${operator}, got: ${typeof filter}`)
				}
			}
			// break
			case '$': {
				const resource = escapeResource(filter as string | string[])
				return addParentKey(resource, parentKey)
			}
			// break
			case '$and':
			case '$or': {
				const filterStr = buildFilter(filter, undefined, ` ${operator.slice(1)} `)
				return addParentKey(filterStr, parentKey)
			}
			// break
			case '$in': {
				if (isPrimitive(filter)) {
					const filterStr = escapeValue(filter)
					return addParentKey(filterStr, parentKey, ' eq ')
				} else if (utils.isArray(filter)) {
					const filterStr = handleFilterArray(filter, parentKey, 1)
					return bracketJoin(filterStr, ' or ')
				} else if (utils.isObject(filter)) {
					const filterArr = handleFilterObject(filter, parentKey)
					if (filterArr.length < 1) {
						throw new Error(`${operator} objects must have at least 1 property, got: ${JSON.stringify(filter)}`)
					}
					return bracketJoin(filterArr, ' or ')
				} else {
					throw new Error(`Expected null/string/number/bool/obj/array, got: ${typeof filter}`)
				}
			}
			// break
			case '$not': {
				const filterStr = `not(${buildFilter(filter)})`
				return addParentKey(filterStr, parentKey)
			}
			// break
			case '$any':
			case '$all':
				const lamda = filter as PinejsClientCoreFactory.Lambda
				const lambdaName = operator.slice(1)
				const alias = lamda.$alias
				let expr = lamda.$expr
				if (alias == null) {
					throw new Error(`Lambda expression (${lambdaName}) has no alias defined.`)
				}
				if (expr == null) {
					throw new Error(`Lambda expression (${lambdaName}) has no expr defined.`)
				}
				// Disable the expandFilter deprecation notice when inside a lambda expr
				const deprecatedFn = deprecated.expandFilter = noop
				let filterStr
				try {
					filterStr = buildFilter(expr)
				}
				finally {
					deprecated.expandFilter = deprecatedFn
				}
				filterStr = `${lambdaName}(${alias}:${filterStr})`
				return addParentKey(filterStr, parentKey, '/')
			// break
			default:
				throw new Error(`Unrecognised operator: '${operator.slice(1)}'`)
		}
	}

	const handleFilterObject = (filter: PinejsClientCoreFactory.FilterObj, parentKey?: string[]) => {
		return mapObj(filter, (value, key) => {
			if (value === undefined) {
				throw new Error(`'${key}' was present on a filter object but undefined, did you mean to use null instead?`)
			}
			if (key[0] === '$') {
				return handleFilterOperator(value, key, parentKey)
			} else {
				let keys = [key]
				if (parentKey != null) {
					if (parentKey.length > 0) {
						deprecated.expandFilter()
					}
					keys = parentKey.concat(keys)
				}
				return buildFilter(value, keys)
			}
		})
	}

	const handleFilterArray = (filter: PinejsClientCoreFactory.FilterArray, parentKey?: string[], minElements = 2) => {
		if (filter.length < minElements) {
			throw new Error(`Filter arrays must have at least ${minElements} elements, got: ${JSON.stringify(filter)}`)
		}

		return map(filter, (value) => {
			return buildFilter(value, parentKey)
		})
	}

	// Turn a filter query object into an OData $filter string
	const buildFilter = (filter: PinejsClientCoreFactory.Filter, parentKey?: string[], joinStr?: string): string => {
		if (isPrimitive(filter)) {
			const filterStr = escapeValue(filter)
			return addParentKey(filterStr, parentKey)
		} else if (utils.isArray(filter)) {
			const filterArr = handleFilterArray(filter)
			const filterStr = bracketJoin(filterArr, defaults(joinStr, ' or '))
			return addParentKey(filterStr, parentKey)
		} else if (utils.isObject(filter)) {
			const filterArr = handleFilterObject(filter, parentKey)
			return bracketJoin(filterArr, defaults(joinStr, ' and '))
		} else {
			throw new Error(`Expected null/string/number/obj/array, got: ${typeof filter}`)
		}
	}

	const buildOrderBy = (orderby: PinejsClientCoreFactory.OrderBy): string => {
		if (utils.isString(orderby)) {
			return orderby
		} else if (utils.isArray(orderby)) {
			const result = map(orderby, (value) => {
				if (utils.isArray(value)) {
					throw new Error(`'$orderby' cannot have nested arrays`)
				}
				return buildOrderBy(value)
			})
			return join(result)
		} else if (utils.isObject(orderby)) {
			const result = mapObj(orderby, (dir, key) => {
				if (dir !== 'asc' && dir !== 'desc') {
					throw new Error(`'$orderby' direction must be 'asc' or 'desc'`)
				}
				return `${key} ${dir}`
			})
			if (result.length !== 1) {
				throw new Error(`'$orderby' objects must have exactly one element, got ${result.length} elements`)
			}
			return result[0]
		} else {
			throw new Error(`'$orderby' option has to be either a string, array, or object`)
		}
	}

	const buildOption = (option: string, value: PinejsClientCoreFactory.ODataOptions['']) => {
		let compiledValue: string = ''
		switch (option) {
			case '$filter':
				compiledValue = buildFilter(value as PinejsClientCoreFactory.Filter)
			break
			case '$expand':
				compiledValue = buildExpand(value as PinejsClientCoreFactory.Expand)
			break
			case '$orderby':
				compiledValue = buildOrderBy(value as PinejsClientCoreFactory.OrderBy)
			break
			case '$top':
			case '$skip':
				const num = value
				if (!utils.isNumber(num)) {
					throw new Error(`'${option}' option has to be a number`)
				}
				compiledValue = '' + num
			break
			case '$select':
				const select = value
				if (utils.isString(select) || utils.isArray(select)) {
					compiledValue = join(select as string | string[])
				} else {
					throw new Error(`'${option}' option has to be either a string or array`)
				}
			break
			default:
				// Unknown values are left as-is
				if (utils.isArray(value)) {
					compiledValue = join(value as string[])
				} else if (utils.isString(value)) {
					compiledValue = value
				} else {
					throw new Error(`Unknown type for option ${typeof value}`)
				}
		}
		return `${option}=${compiledValue}`
	}

	const handleExpandObject = (expand: PinejsClientCoreFactory.ExpandObject, parentKey: string[]) => {
		const expandOptions = []
		const expands = []
		for (const key in expand) {
			if (expand.hasOwnProperty(key)) {
				const value = expand[key]
				if (key[0] === '$') {
					if(!isValidOption(key)) {
						throw new Error(`Unknown key option '${key}'`)
					}
					if (parentKey.length === 0) {
						throw new Error('Cannot have expand options without first expanding something!')
					}
					expandOptions.push(buildOption(key, value))
				} else {
					if (parentKey.length > 0) {
						deprecated.expandObject()
					}
					const expandedKeys = parentKey.concat(key)
					expands.push(buildExpand(value, expandedKeys))
				}
			}
		}
		if (expandOptions.length > 0 || expands.length == 0) {
			let expandStr = expandOptions.join('&')
			expandStr = escapeResource(parentKey) + `(${expandStr})`
			expands.push(expandStr)
		}
		return expands
	}

	const handleExpandArray = (expands: PinejsClientCoreFactory.ExpandArray, parentKey?: string[]) => {
		if (expands.length < 1) {
			throw new Error(`Expand arrays must have at least 1 elements, got: ${JSON.stringify(expands)}`)
		}

		return map(expands, (expand) => {
			return buildExpand(expand, parentKey)
		})
	}

	const buildExpand = (expand: PinejsClientCoreFactory.Expand, parentKey: string[] = []): string => {
		if (isPrimitive(expand)) {
			if (parentKey.length > 0) {
				deprecated.expandPrimitive()
			}
			return escapeResource(parentKey.concat(expand))
		} else if (utils.isArray(expand)) {
			const expandStr = handleExpandArray(expand, parentKey)
			return join(expandStr)
		} else if (utils.isObject(expand)) {
			const expandStr = handleExpandObject(expand, parentKey)
			return join(expandStr)
		} else {
			throw new Error(`Unknown type for expand '${typeof expand}'`)
		}
	}

	const validParams: PinejsClientCoreFactory.SharedParam[] = [
		'apiPrefix',
		'passthrough',
		'passthroughByMethod'
	]

	abstract class PinejsClientCore<
		T,
		PromiseObj extends PromiseLike<{}> = Promise<{}>,
		PromiseResult extends PromiseLike<PinejsClientCoreFactory.PromiseResultTypes> = Promise<PinejsClientCoreFactory.PromiseResultTypes>
	> implements PinejsClientCoreFactory.PinejsClientCore<T, PromiseObj, PromiseResult> {

		apiPrefix: string = '/'
		passthrough: PinejsClientCoreFactory.AnyObject = {}
		passthroughByMethod: PinejsClientCoreFactory.AnyObject = {}
		backendParams: PinejsClientCoreFactory.AnyObject

		// `backendParams` must be used by a backend for any additional parameters it may have.
		constructor(params: string | PinejsClientCoreFactory.Params) {
			if (utils.isString(params)) {
				params = { apiPrefix: params }
			}

			if (utils.isObject(params)) {
				for (const validParam of validParams) {
					const value = params[validParam]
					if (value != null) {
						this[validParam] = value
					}
				}
			}
		}


		// `backendParams` must be used by a backend for any additional parameters it may have.
		clone(params: string | PinejsClientCoreFactory.Params, backendParams?: PinejsClientCoreFactory.AnyObject): T {
			if (utils.isString(params)) {
				params = { apiPrefix: params }
			}

			const cloneParams: typeof params = {}
			for (const validParam of validParams) {
				if (this[validParam] != null) {
					cloneParams[validParam] = this[validParam]
				}
				if (params != null && params[validParam] != null) {
					cloneParams[validParam] = params[validParam]
				}
			}

			let cloneBackendParams: typeof backendParams = {}
			if (utils.isObject(this.backendParams)) {
				cloneBackendParams = { ...this.backendParams }
			}
			if (utils.isObject(backendParams)) {
				cloneBackendParams = { ...cloneBackendParams, ...backendParams }
			}
			return new (this.constructor as { new (params: string | PinejsClientCoreFactory.Params, backendParams: PinejsClientCoreFactory.AnyObject): T })(cloneParams, cloneBackendParams)
		}

		get(params: PinejsClientCoreFactory.Params): PromiseResult {
			const singular = utils.isObject(params) && params.id != null
			return this.request(params, { method: 'GET' }).then((data: {d: any[]}) => {
				if (!utils.isObject(data)) {
					throw new Error(`Response was not a JSON object: '${typeof data}'`)
				}
				if (data.d == null) {
					throw new Error("Invalid response received, the 'd' property is missing.")
				}
				if (singular) {
					if (data.d.length > 1) {
						throw new Error('Returned multiple results when only one was expected.')
					}
					return data.d[0]
				}
				return data.d
			}) as PromiseResult
		}

		query(params: PinejsClientCoreFactory.Params) {
			return this.get(params)
		}

		put(params: PinejsClientCoreFactory.Params) {
			return this.request(params, { method: 'PUT' })
		}

		patch(params: PinejsClientCoreFactory.Params) {
			return this.request(params, { method: 'PATCH' })
		}

		post(params: PinejsClientCoreFactory.Params) {
			return this.request(params, { method: 'POST' })
		}

		delete(params: PinejsClientCoreFactory.Params) {
			return this.request(params, { method: 'DELETE' })
		}

		compile(params: PinejsClientCoreFactory.Params) {
			if (utils.isString(params)) {
				return params
			} else if (params.url != null) {
				return params.url
			} else {
				if (params.resource == null) {
					throw new Error('Either the url or resource must be specified.')
				}
				let url = params.resource

				if (params.hasOwnProperty('id')) {
					if (params.id == null) {
						throw new Error('If the id property is set it must be non-null')
					}
					url += `(${escapeValue(params.id)})`
				}

				let queryOptions: string[] = []
				if (params.options != null) {
					queryOptions = mapObj(params.options, (value, option) => {
						if (option[0] !== '$') {
							deprecated.implicitOptions()
							option = '$' + option
						}
						if(!isValidOption(option)) {
							throw new Error(`Unknown option '${option}'`)
						}
						return buildOption(option, value)
					})
				}
				if (params.customOptions != null) {
					queryOptions = queryOptions.concat(
						mapObj(params.customOptions, (value, option) => {
							return buildOption(option, value)
						})
					)
				}
				if (queryOptions.length > 0) {
					url += '?' + queryOptions.join('&')
				}
				return url
			}
		}

		request(params: PinejsClientCoreFactory.Params, overrides: { method?: PinejsClientCoreFactory.ODataMethod } = {}): PromiseObj {
			try {
				let { method, body, passthrough = {} } = params

				if (utils.isString(params)) {
					method = 'GET'
				}

				const apiPrefix = defaults(params.apiPrefix, this.apiPrefix)
				const url = apiPrefix + this.compile(params)

				method = defaults(method, overrides.method, 'GET')
				method = method.toUpperCase() as typeof method
				// Filter to prevent accidental parameter passthrough.
				const opts = {
					...this.passthrough,
					...defaults(this.passthroughByMethod[method], {}),
					...passthrough,
					url,
					body,
					...overrides,
					method,
				}

				return this._request(opts)
			} catch (e) {
				return Promise.reject(e) as PromiseObj
			}
		}

		abstract _request(
			params: {
				method: string,
				url: string,
				body?: PinejsClientCoreFactory.AnyObject,
			} & PinejsClientCoreFactory.AnyObject
		): PromiseObj

	}

	return PinejsClientCore
}

declare namespace PinejsClientCoreFactory {
	export abstract class PinejsClientCore<T, PromiseObj extends PromiseLike<{}> = Promise<{}>, PromiseResult extends PromiseLike<number | AnyObject | AnyObject[]> = Promise<number | AnyObject | AnyObject[]>> {
		apiPrefix: string
		passthrough: AnyObject
		passthroughByMethod: AnyObject
		backendParams: AnyObject

		// `backendParams` must be used by a backend for any additional parameters it may have.
		constructor(params: string | Params, backendParams?: AnyObject)


		// `backendParams` must be used by a backend for any additional parameters it may have.
		clone(params: string | Params, backendParams?: AnyObject): T

		query(params: Params): PromiseResult

		get(params: Params): PromiseResult

		put(params: Params): PromiseObj

		patch(params: Params): PromiseObj

		post(params: Params): PromiseObj

		delete(params: Params): PromiseObj

		compile(params: Params): string

		request(params: Params, overrides: { method?: ODataMethod }): PromiseObj

		abstract _request(
			params: {
				method: string,
				url: string,
				body?: AnyObject,
			} & AnyObject
		): PromiseObj
	}

	export type PromiseResultTypes = number | PinejsClientCoreFactory.AnyObject | PinejsClientCoreFactory.AnyObject[]

	export interface Util {
		isString(v?: any): v is string
		isNumber(v?: any): v is number
		isBoolean(v?: any): v is boolean
		isObject(v?: any): v is object
		isArray<T>(v?: any): v is Array<T>
		isDate(v?: any): v is Date
	}
	interface PromiseRejector {
		reject(err: any): PromiseLike<any>
	}

	interface ResourceObj<T> {
		[index: string]: T
	}

	type FilterOperationKey = '$ne' | '$eq' | '$gt' | '$ge' | '$lt' | '$le' | '$add' | '$sub' | '$mul' | '$div' | '$mod'
	type FilterOperationValue = Filter
	type FilterFunctionKey = '$contains' | '$endswith' | '$startswith' | '$length' | '$indexof' | '$substring' | '$tolower' | '$toupper' | '$trim' | '$concat' | '$year' | '$month' | '$day' | '$hour' | '$minute' | '$second' | '$fractionalseconds' | '$date' | '$time' | '$totaloffsetminutes' | '$now' | '$maxdatetime' | '$mindatetime' | '$totalseconds' | '$round' | '$floor' | '$ceiling' | '$isof' | '$cast'
	type FilterFunctionValue = Filter

	export interface FilterObj extends ResourceObj<Filter | undefined> {
		$raw?: RawFilter

		$?: string | string[]

		$and?: Filter
		$or?: Filter

		$in?: Filter

		$not?: Filter

		$any?: Lambda
		$all?: Lambda

		// Filter operations
		$ne?: FilterOperationValue,
		$eq?: FilterOperationValue,
		$gt?: FilterOperationValue,
		$ge?: FilterOperationValue,
		$lt?: FilterOperationValue,
		$le?: FilterOperationValue,
		$add?: FilterOperationValue,
		$sub?: FilterOperationValue,
		$mul?: FilterOperationValue,
		$div?: FilterOperationValue,
		$mod?: FilterOperationValue,

		// Filter functions
		$contains?: FilterFunctionValue,
		$endswith?: FilterFunctionValue,
		$startswith?: FilterFunctionValue,
		$length?: FilterFunctionValue,
		$indexof?: FilterFunctionValue,
		$substring?: FilterFunctionValue,
		$tolower?: FilterFunctionValue,
		$toupper?: FilterFunctionValue,
		$trim?: FilterFunctionValue,
		$concat?: FilterFunctionValue,
		$year?: FilterFunctionValue,
		$month?: FilterFunctionValue,
		$day?: FilterFunctionValue,
		$hour?: FilterFunctionValue,
		$minute?: FilterFunctionValue,
		$second?: FilterFunctionValue,
		$fractionalseconds?: FilterFunctionValue,
		$date?: FilterFunctionValue,
		$time?: FilterFunctionValue,
		$totaloffsetminutes?: FilterFunctionValue,
		$now?: FilterFunctionValue,
		$maxdatetime?: FilterFunctionValue,
		$mindatetime?: FilterFunctionValue,
		$totalseconds?: FilterFunctionValue,
		$round?: FilterFunctionValue,
		$floor?: FilterFunctionValue,
		$ceiling?: FilterFunctionValue,
		$isof?: FilterFunctionValue,
		$cast?: FilterFunctionValue,
	}

	export interface FilterArray extends Array<Filter> {}
	export type FilterString = string
	// Strictly speaking `[ string, ...Filter ]` but there isn't a way to type that yet
	export type RawFilter = string | (string | Filter)[] | {
		$string: string
		[index: string]: Filter
	}
	export type Lambda = {
		$alias: string
		$expr: Filter
	}
	export type Filter = number | FilterString | FilterObj | FilterArray

	export interface ResourceExpand extends ResourceObj<Expand> {}
	export type ExpandObject = ODataOptions & ResourceExpand

	export interface ExpandArray extends Array<Expand> {}
	export type Expand = string | ExpandArray | ExpandObject

	export type OrderBy = string | string[] | {
		[index: string]: 'asc' | 'desc'
	}

	export interface ODataOptions {
		$filter?: Filter
		$expand?: Expand
		$orderby?: OrderBy
		$top?: number
		$skip?: number
		$select?: string | string[]
		[index: string]: undefined | number | string | string[] | Filter | Expand | OrderBy
	}
	export type OptionsObject = ODataOptions

	export type ODataMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

	type ResourceId = string | number | Date

	type SharedParam = 'apiPrefix' | 'passthrough' | 'passthroughByMethod'


	export type AnyObject = {
		[index: string]: any
	}

	export type Params = {
		apiPrefix?: string
		method?: ODataMethod
		resource?: string
		id?: ResourceId
		url?: string
		body?: AnyObject
		passthrough?: AnyObject
		passthroughByMethod?: {
			GET: AnyObject
			POST: AnyObject
			PATCH: AnyObject
			DELETE: AnyObject
		}
		customOptions?: AnyObject
		options?: ODataOptions
	}
}

export = PinejsClientCoreFactory
