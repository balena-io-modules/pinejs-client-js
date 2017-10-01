declare namespace PinejsClientCoreFactory {
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

	type FilterOperationValue = Filter
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

	export type ODataOptions = {
		$filter?: Filter
		$expand?: Expand
		$orderby?: OrderBy
		$top?: number
		$skip?: number
		$select?: string | string[]
	}
	export type OptionsObject = ODataOptions & {
		[index: string]: string | string[]
	}

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

	export abstract class PinejsClientCore<T, PromiseObj extends PromiseLike<{}> = Promise<{}>, PromiseResult extends PromiseLike<number | AnyObject | AnyObject[]> = Promise<number | AnyObject | AnyObject[]>> {
		apiPrefix: string
		passthrough: AnyObject
		passthroughByMethod: AnyObject
		backendParams: AnyObject

		// `backendParams` must be used by a backend for any additional parameters it may have.
		constructor(params: string | Params, backendParams?: AnyObject)


		// `backendParams` must be used by a backend for any additional parameters it may have.
		clone(params: string | Params, backendParams?: AnyObject): PinejsClientCore<T, PromiseResult, PromiseObj>

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
			} & AnyObject): PromiseObj
	}
}

declare function PinejsClientCoreFactory(utils: PinejsClientCoreFactory.Util, Promise: PinejsClientCoreFactory.PromiseRejector): typeof PinejsClientCoreFactory.PinejsClientCore

export = PinejsClientCoreFactory
