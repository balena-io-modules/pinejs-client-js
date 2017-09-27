interface Util {
	isString(v?: any): v is string
	isNumber(v?: any): v is number
	isBoolean(v?: any): v is boolean
	isObject(v?: any): v is object
	isArray<T>(v?: any): v is Array<T>
	isDate(v?: any): v is Date
}

interface PromiseRejector {
	reject(err: any): Promise<{}>
}

interface ResourceObj<T> {
	[index: string]: T
}

type FilterOperationKey = '$ne' | '$eq' | '$gt' | '$ge' | '$lt' | '$le' | '$add' | '$sub' | '$mul' | '$div' | '$mod'
type FilterOperationValue = Filter
type FilterOperations = {
	[P in FilterOperationKey]: FilterOperationValue
}
type FilterFunctionKey = '$contains' | '$endswith' | '$startswith' | '$length' | '$indexof' | '$substring' | '$tolower' | '$toupper' | '$trim' | '$concat' | '$year' | '$month' | '$day' | '$hour' | '$minute' | '$second' | '$fractionalseconds' | '$date' | '$time' | '$totaloffsetminutes' | '$now' | '$maxdatetime' | '$mindatetime' | '$totalseconds' | '$round' | '$floor' | '$ceiling' | '$isof' | '$cast'
type FilterFunctionValue = Filter
type FilterFunctions = {
	[P in FilterFunctionKey]: FilterFunctionValue
}

interface ResourceFilter extends ResourceObj<Filter> {}

type FilterObj = FilterOperations & FilterFunctions & {
	$raw?: RawFilter

	$?: string | string[]

	$and?: Filter
	$or?: Filter

	$in?: Filter

	$not?: Filter

	$any?: Lambda
	$all?: Lambda
} & ResourceFilter

interface FilterArray extends Array<Filter> {}
type FilterString = string
// Strictly speaking `[ string, ...Filter ]` but there isn't a way to type that yet
type RawFilter = string | (string | Filter)[] | {
	$string: string
	[index: string]: Filter
}
type Lambda = {
	$alias: string
	$expr: Filter
}
type Filter = number | FilterString | FilterObj | FilterArray

interface ResourceExpand extends ResourceObj<Expand> {}
type ExpandObject = ODataOptions & ResourceExpand

interface ExpandArray extends Array<Expand> {}
type Expand = string | ExpandArray | ExpandObject

type OrderBy = string | string[] | {
	[index: string]: 'asc' | 'desc'
}

type ODataOptions = {
	$filter?: Filter
	$expand?: Expand
	$orderby?: OrderBy
	$top?: number
	$skip?: number
	$select?: string | string[]
}
type OptionsObject = ODataOptions & {
	[index: string]: string | string[]
}

type ODataMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type ResourceId = string | number | Date

type SharedParam = 'apiPrefix' | 'passthrough' | 'passthroughByMethod'


declare namespace PinejsClientCoreFactory {
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

	export abstract class PinejsClientCore<T> {
		apiPrefix: string
		passthrough: AnyObject
		passthroughByMethod: AnyObject
		backendParams: AnyObject

		// `backendParams` must be used by a backend for any additional parameters it may have.
		constructor(params: string | Params, backendParams?: AnyObject)


		// `backendParams` must be used by a backend for any additional parameters it may have.
		clone(params: string | Params, backendParams?: AnyObject): PinejsClientCore<T>

		query(params: Params): Promise<number | AnyObject | AnyObject[]>

		get(params: Params): Promise<number | AnyObject | AnyObject[]>

		put(params: Params): Promise<{}>

		patch(params: Params): Promise<{}>

		post(params: Params): Promise<{}>

		delete(params: Params): Promise<{}>

		compile(params: Params): string

		request(params: Params, overrides: { method?: ODataMethod }): Promise<{}>

		abstract _request: (
			params: {
				method: string,
				url: string,
				body?: AnyObject,
			} & AnyObject) => Promise<{}>
	}
}

declare function PinejsClientCoreFactory(utils: Util, Promise: PromiseRejector): typeof PinejsClientCoreFactory.PinejsClientCore

export = PinejsClientCoreFactory
