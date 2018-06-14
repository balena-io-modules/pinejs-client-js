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
	'expandFilter',
	'`$filter: a: b: ...` is deprecated, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.'
)

function defaults <T>(a: T | undefined, b: T | undefined, z: T): T
function defaults <T>(a: T | undefined, z: T): T
function defaults <T>(...args: (T | undefined)[]): T | undefined {
	for (const arg of args) {
		if (arg != null) {
			return arg
		}
	}
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

const NumberIsFinite: (
	(v: any) => v is number
 ) = (Number as any).isFinite || (
	(v) => typeof v === 'number' && isFinite(v)
)

const isString = (v: any): v is string =>
	typeof v === 'string'

const isBoolean = (v: any): v is boolean =>
	v === true || v === false

const isDate = (v: any): v is Date =>
	Object.prototype.toString.call(v) === '[object Date]'

const isObject = (v: any): v is object =>
	typeof v === 'object'

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

// Workaround the fact that `setTimeout` returns a different type in nodejs vs browsers
// TODO: typescript 2.8 will introduce `ReturnType` as a better way to do this
const _setTimeoutResult = false as true && setTimeout(() => {}, 0)

type PollOnObj = {
	unsubscribe: () => void
}
class Poll<PromiseResult extends PromiseLike<number | PinejsClientCoreFactory.AnyObject | PinejsClientCoreFactory.AnyObject[]> = Promise<number | PinejsClientCoreFactory.AnyObject | PinejsClientCoreFactory.AnyObject[]>> {
	private subscribers: {
		error: Array<(response: PromiseResult) => void>,
		data: Array<(err: any) => void>,
	} = {
		error: [],
		data: [],
	}

	private stopped = false
	private pollInterval?: typeof _setTimeoutResult

	private requestFn: null | (() => PromiseResult)

	constructor(
		requestFn: () => PromiseResult,
		private intervalTime = 10000
	) {
		this.requestFn = requestFn
		this.start()
	}

	setPollInterval(intervalTime: number) {
		this.intervalTime = intervalTime
		this.restartTimeout()
	}

	runRequest() {
		if (this.stopped || this.requestFn == null) {
			return
		}
		this.requestFn()
		.then((response) => {
			if (this.stopped) {
				return
			}
			this.restartTimeout()

			// Catch errors in event subscribers so that they don't trigger
			// the 'catch' below, and that subsequent subscribers will still
			// be called
			this.subscribers.data.forEach((fn) => {
				try {
					fn(response)
				} catch (error) {
					console.error('pinejs-client error: Caught error in data event subscription:', error)
				}
			})

			return null
		}, (err: any) => {
			if (this.stopped) {
				return
			}
			this.restartTimeout()

			this.subscribers.error.forEach((fn) => {
				try {
					fn(err)
				} catch (error) {
					console.error('pinejs-client error: Caught error in error event subscription:', error)
				}
			})

			return null
		})
	}

	on(name: 'error', fn: (response: PromiseResult) => void): PollOnObj
	on(name: 'data', fn: (err: any) => void): PollOnObj
	on(name: keyof Poll['subscribers'], fn: (value: any) => void): PollOnObj {
		const subscribers = this.subscribers[name] as Array<(value: any) => void>
		const index = subscribers.push(fn) - 1

		return {
			unsubscribe: () => delete this.subscribers[name][index]
		}
	}

	start() {
		this.stopped = false
		this.runRequest()
	}

	stop() {
		if (this.pollInterval) {
			clearTimeout(this.pollInterval)
		}
		this.stopped = true
	}

	destroy() {
		this.stop()
		this.requestFn = null
		this.subscribers = {
			error: [],
			data: [],
		}
	}

	private restartTimeout() {
		if(this.stopped) {
			return
		}
		if (this.pollInterval) {
			clearTimeout(this.pollInterval)
		}
		this.pollInterval = setTimeout(
			() => this.runRequest(),
			this.intervalTime
		)
	}
}

export function PinejsClientCoreFactory(Promise: PinejsClientCoreFactory.PromiseRejector): typeof PinejsClientCoreFactory.PinejsClientCore {
	if (!isPromiseRejector(Promise)) {
		throw new Error('The Promise implementation must support .reject')
	}

	const isPrimitive = (value?: any): value is null | string | number | boolean | Date => {
		return value === null || isString(value) || NumberIsFinite(value) || isBoolean(value) || isDate(value)
	}

	// Escape a resource name (string), or resource path (array)
	const escapeResource = (resource: string | string[]) => {
		if (isString(resource)) {
			return encodeURIComponent(resource)
		} else if (Array.isArray(resource)) {
			return resource.map(encodeURIComponent).join('/')
		} else {
			throw new Error('Not a valid resource: ' + typeof resource)
		}
	}

	// Escape a primitive value
	const escapeValue = (value: null | string | number | boolean | Date) => {
		if (isString(value)) {
			value = value.replace(/'/g, "''")
			return `'${encodeURIComponent(value)}'`
		} else if (isDate(value)) {
			return `datetime'${value.toISOString()}'`
		} else if (value === null || NumberIsFinite(value) || isBoolean(value)) {
			return value
		} else {
			throw new Error('Not a valid value: ' + typeof value)
		}
	}

	const join = (strOrArray: string | string[], separator = ',') => {
		if (isString(strOrArray)) {
			return strOrArray
		} else if (Array.isArray(strOrArray)) {
			return strOrArray.join(separator)
		} else {
			throw new Error('Expected a string or array, got: ' + typeof strOrArray)
		}
	}

	// Join together a bunch of statements making sure the whole lot is correctly parenthesised
	const bracketJoin = (arr: string[][], separator: string) => {
		if (arr.length === 1) {
			return arr[0]
		}
		const resultArr: string[] = []
		arr.map((subArr) => {
			if (subArr.length > 1) {
				return `(${subArr.join('')})`
			}
			return subArr[0]
		}).forEach((str, i) => {
			if (i !== 0) {
				resultArr.push(separator)
			}
			resultArr.push(str)
		})
		return resultArr
	}

	// Add the parentKey + operator if (it exists.) {
	const addParentKey = (filter: string[] | string | boolean | number | null, parentKey?: string[], operator = ' eq ') => {
		if (parentKey != null) {
			if (Array.isArray(filter)) {
				if (filter.length === 1) {
					filter = filter[0]
				} else {
					filter = `(${filter.join('')})`
				}
			} else {
				filter = `${filter}`
			}
			return [ escapeResource(parentKey), operator, filter ]
		}
		if (Array.isArray(filter)) {
			return filter
		}
		return [ `${filter}` ]
	}

	const applyBinds = (filter: string, params: {[index: string]: PinejsClientCoreFactory.Filter}, parentKey?: string[]) => {
		for (const index in params) {
			const param = params[index]
			let paramStr = `(${buildFilter(param).join('')})`
			// Escape $ for filter.replace
			paramStr = paramStr.replace(/\$/g, '$$$$')
			filter = filter.replace(new RegExp(`\\$${index}([^a-zA-Z0-9]|$)`, 'g'), `${paramStr}$1`)
		}
		filter = `(${filter})`
		return addParentKey(filter, parentKey)
	}

	const filterOperation = (filter: PinejsClientCoreFactory.FilterOperationValue, operator: PinejsClientCoreFactory.FilterOperationKey, parentKey?: string[]) => {
		const op = ' ' + operator.slice(1) + ' '
		if (isPrimitive(filter)) {
			const filterStr = escapeValue(filter)
			return addParentKey(filterStr, parentKey, op)
		} else if (Array.isArray(filter)) {
			const filterArr = handleFilterArray(filter)
			const filterStr = bracketJoin(filterArr, op)
			return addParentKey(filterStr, parentKey)
		} else if (isObject(filter)) {
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
	): string[] => {
		const fnName = fnIdentifier.slice(1)
		if (isPrimitive(filter)) {
			const operands = []
			if (parentKey != null) {
				operands.push(escapeResource(parentKey))
			}
			operands.push(escapeValue(filter))
			return [ `${fnName}(${operands.join()})` ]
		} else if (Array.isArray(filter)) {
			const filterArr = handleFilterArray(filter)
			let filterStr = filterArr.map((subArr) => subArr.join('')).join(',')
			filterStr = `${fnName}(${filterStr})`
			return addParentKey(filterStr, parentKey)
		} else if (isObject(filter)) {
			const filterArr = handleFilterObject(filter)
			let filterStr = filterArr.map((subArr) => subArr.join('')).join(',')
			filterStr = `${fnName}(${filterStr})`
			return addParentKey(filterStr, parentKey)
		} else {
			throw new Error(`Expected null/string/number/obj/array, got: ${typeof filter}`)
		}
	}

	// Handle special cases for all the different $ operators.
	const handleFilterOperator = (filter: PinejsClientCoreFactory.Filter, operator: keyof PinejsClientCoreFactory.FilterObj, parentKey?: string[]): string[] => {
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
				if (isString(filter)) {
					filter = `(${filter})`
					return addParentKey(filter, parentKey)
				} else if (!isPrimitive(filter)) {
					if (Array.isArray(filter)) {
						const [ rawFilter, ...params ] = filter
						if (!isString(rawFilter)) {
							throw new Error(`First element of array for ${operator} must be a string, got: ${typeof rawFilter}`)
						}
						const mappedParams: {[index: string]: PinejsClientCoreFactory.Filter} = {}
						for (let index = 0; index < params.length; index++) {
							mappedParams[index + 1] = params[index]
						}
						return applyBinds(rawFilter, mappedParams, parentKey)
					} else if (isObject(filter)) {
						const params = filter
						const filterStr = filter.$string
						if (!isString(filterStr)) {
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
					}
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
				} else if (Array.isArray(filter)) {
					const filterStr = handleFilterArray(filter, parentKey, 1)
					return bracketJoin(filterStr, ' or ')
				} else if (isObject(filter)) {
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
				const filterStr = `not(${buildFilter(filter).join('')})`
				return addParentKey(filterStr, parentKey)
			}
			// break
			case '$any':
			case '$all':
				const lamda = filter as PinejsClientCoreFactory.Lambda
				const alias = lamda.$alias
				let expr = lamda.$expr
				if (alias == null) {
					throw new Error(`Lambda expression (${operator}) has no alias defined.`)
				}
				if (expr == null) {
					throw new Error(`Lambda expression (${operator}) has no expr defined.`)
				}
				// Disable the expandFilter deprecation notice when inside a lambda expr
				const deprecatedFn = deprecated.expandFilter = noop
				let filterStr
				try {
					filterStr = buildFilter(expr).join('')
				}
				finally {
					deprecated.expandFilter = deprecatedFn
				}
				filterStr = `${operator.slice(1)}(${alias}:${filterStr})`
				return addParentKey(filterStr, parentKey, '/')
			// break
			default:
				throw new Error(`Unrecognised operator: '${operator}'`)
		}
	}

	const handleFilterObject = (filter: PinejsClientCoreFactory.FilterObj, parentKey?: string[]) => {
		return mapObj(filter, (value, key) => {
			if (value === undefined) {
				throw new Error(`'${key}' was present on a filter object but undefined, did you mean to use null instead?`)
			}
			if (key[0] === '$') {
				return handleFilterOperator(value, key, parentKey)
			} else if (key[0] === '@') {
				if (!isString(value)) {
					throw new Error(`Parameter alias reference must be a string, got: ${typeof value}`)
				}
				const parameterAlias = `@${encodeURIComponent(value)}`
				return addParentKey(parameterAlias, parentKey)
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

		return filter.map((value) => {
			return buildFilter(value, parentKey)
		})
	}

	// Turn a filter query object into an OData $filter string
	const buildFilter = (filter: PinejsClientCoreFactory.Filter, parentKey?: string[], joinStr?: string): string[] => {
		if (isPrimitive(filter)) {
			const filterStr = escapeValue(filter)
			return addParentKey(filterStr, parentKey)
		} else if (Array.isArray(filter)) {
			const filterArr = handleFilterArray(filter)
			const filterStr = bracketJoin(filterArr, defaults(joinStr, ' or '))
			return addParentKey(filterStr, parentKey)
		} else if (isObject(filter)) {
			const filterArr = handleFilterObject(filter, parentKey)
			return bracketJoin(filterArr, defaults(joinStr, ' and '))
		} else {
			throw new Error(`Expected null/string/number/obj/array, got: ${typeof filter}`)
		}
	}

	const buildOrderBy = (orderby: PinejsClientCoreFactory.OrderBy): string => {
		if (isString(orderby)) {
			return orderby
		} else if (Array.isArray(orderby)) {
			const result = orderby.map((value) => {
				if (Array.isArray(value)) {
					throw new Error(`'$orderby' cannot have nested arrays`)
				}
				return buildOrderBy(value)
			})
			return join(result)
		} else if (isObject(orderby)) {
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
				compiledValue = buildFilter(value as PinejsClientCoreFactory.Filter).join('')
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
				if (!NumberIsFinite(num)) {
					throw new Error(`'${option}' option has to be a number`)
				}
				compiledValue = '' + num
			break
			case '$select':
				const select = value
				if (isString(select) || Array.isArray(select)) {
					compiledValue = join(select as string | string[])
				} else {
					throw new Error(`'${option}' option has to be either a string or array`)
				}
			break
			default:
				// Escape parameter aliases as primitives
				if(option[0] === '@') {
					if (!isPrimitive(value)) {
						throw new Error(`Unknown type for parameter alias option '${option}': ${typeof value}`)
					}
					compiledValue = '' + escapeValue(value)
				}
				// Unknown values are left as-is
				else if (Array.isArray(value)) {
					compiledValue = join(value as string[])
				} else if (isString(value)) {
					compiledValue = value
				} else if (isBoolean(value) || NumberIsFinite(value)) {
					compiledValue = value.toString()
				} else {
					throw new Error(`Unknown type for option ${typeof value}`)
				}
		}
		return `${option}=${compiledValue}`
	}

	const handleExpandOptions = (expand: PinejsClientCoreFactory.ODataOptions, parentKey: string) => {
		const expandOptions = []
		for (const key in expand) {
			if (expand.hasOwnProperty(key)) {
				const value = expand[key]
				if (key[0] === '$') {
					if(!isValidOption(key)) {
						throw new Error(`Unknown key option '${key}'`)
					}
					expandOptions.push(buildOption(key, value))
				} else {
					throw new Error(`'$expand: ${parentKey}: ${key}: ...' is invalid, use '$expand: ${parentKey}: $expand: ${key}: ...' instead.`)
				}
			}
		}
		let expandStr = expandOptions.join('&')
		if (expandStr.length > 0) {
			expandStr = `(${expandStr})`
		}
		expandStr = escapeResource(parentKey) + expandStr
		return expandStr
	}
	const handleExpandObject = (expand: PinejsClientCoreFactory.ResourceExpand) => {
		const expands = []
		for (const key in expand) {
			if (expand.hasOwnProperty(key)) {
				if (key[0] === '$') {
					throw new Error('Cannot have expand options without first expanding something!')
				}
				const value = expand[key]
				if (isPrimitive(value)) {
					const jsonValue = JSON.stringify(value)
					throw new Error(`'$expand: ${key}: ${jsonValue}' is invalid, use '$expand: ${key}: $expand: ${jsonValue}' instead.`)
				}
				if (Array.isArray(value)) {
					throw new Error(`'$expand: ${key}: [...]' is invalid, use '$expand: ${key}: {...}' instead.`)
				}
				expands.push(handleExpandOptions(value, key))
			}
		}
		return expands
	}

	const handleExpandArray = (expands: PinejsClientCoreFactory.ResourceExpand[]) => {
		if (expands.length < 1) {
			throw new Error(`Expand arrays must have at least 1 elements, got: ${JSON.stringify(expands)}`)
		}

		return expands.map((expand) => {
			return buildExpand(expand)
		})
	}

	const buildExpand = (expand: PinejsClientCoreFactory.Expand): string => {
		if (isPrimitive(expand)) {
			return escapeResource(expand)
		} else if (Array.isArray(expand)) {
			const expandStr = handleExpandArray(expand)
			return join(expandStr)
		} else if (isObject(expand)) {
			const expandStr = handleExpandObject(expand)
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
			if (isString(params)) {
				params = { apiPrefix: params }
			}

			if (isObject(params)) {
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
			if (isString(params)) {
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
			if (isObject(this.backendParams)) {
				cloneBackendParams = { ...this.backendParams }
			}
			if (isObject(backendParams)) {
				cloneBackendParams = { ...cloneBackendParams, ...backendParams }
			}
			return new (this.constructor as { new (params: string | PinejsClientCoreFactory.Params, backendParams: PinejsClientCoreFactory.AnyObject): T })(cloneParams, cloneBackendParams)
		}

		get(params: PinejsClientCoreFactory.Params): PromiseResult {
			const singular = isObject(params) && params.id != null
			return this.request(params, { method: 'GET' }).then((data: {d: any[]}) => {
				if (!isObject(data)) {
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

		subscribe(params: PinejsClientCoreFactory.SubscribeParams) {
			const singular = isObject(params) && params.id != null
			let pollInterval: PinejsClientCoreFactory.SubscribeParamsObj['pollInterval']

			// precompile the URL string to improve performance
			const compiledUrl = this.compile(params)
			if (isString(params)) {
				params = compiledUrl
			} else {
				params.url = compiledUrl
				pollInterval = params.pollInterval
			}

			const requestFn = () => {
				return this.request(params, { method: 'GET' }).then((data: {d: any[]}) => {
					if (!isObject(data)) {
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

			return new Poll(requestFn, pollInterval)
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
			if (isString(params)) {
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
						if(option[0] === '$' && !isValidOption(option)) {
							throw new Error(`Unknown odata option '${option}'`)
						}
						return buildOption(option, value)
					})
				}
				if ((params as any).customOptions != null) {
					throw new Error('`customOptions` has been removed, use `options` instead.')
				}
				if (queryOptions.length > 0) {
					url += '?' + queryOptions.join('&')
				}
				return url
			}
		}

		request(params: PinejsClientCoreFactory.Params, overrides: { method?: PinejsClientCoreFactory.ODataMethod } = {}): PromiseObj {
			try {
				let method: PinejsClientCoreFactory.ParamsObj['method']
				let body: PinejsClientCoreFactory.ParamsObj['body']
				let passthrough: PinejsClientCoreFactory.ParamsObj['passthrough'] = {}
				let apiPrefix: PinejsClientCoreFactory.ParamsObj['apiPrefix']


				if (isString(params)) {
					method = 'GET'
				} else {
					({ method, body, passthrough = {}, apiPrefix } = params)
				}

				apiPrefix = defaults(apiPrefix, this.apiPrefix)
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

export declare namespace PinejsClientCoreFactory {
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
	export type FilterBaseType = string | number | null | boolean | Date
	// Strictly speaking `[ string, ...Filter ]` but there isn't a way to type that yet
	export type RawFilter = string | (string | Filter)[] | {
		$string: string
		[index: string]: Filter
	}
	export type Lambda = {
		$alias: string
		$expr: Filter
	}
	export type Filter = FilterObj | FilterArray | FilterBaseType

	export interface ResourceExpand extends ResourceObj<ODataOptions> {}

	export type Expand = string | ResourceExpand[] | ResourceExpand

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

	interface ParamsObj {
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
		options?: ODataOptions
	}

	export type Params = ParamsObj | string

	interface SubscribeParamsObj extends ParamsObj {
		pollInterval?: number
	}
	export type SubscribeParams = SubscribeParamsObj | string
}
