export interface Dictionary<T> {
	[index: string]: T;
}

const noop = () => {
	// noop
};
const deprecated: Dictionary<() => void> = {};
const addDeprecated = (name: string, message: string) => {
	deprecated[name] = () => {
		console.warn('pinejs-client deprecated:', message);
		deprecated[name] = noop;
	};
};
addDeprecated(
	'expandFilter',
	'`$filter: a: b: ...` is deprecated, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
);

const mapObj = <T, R>(
	obj: Dictionary<T>,
	fn: (value: T, key: string) => R,
): R[] => Object.keys(obj).map(key => fn(obj[key], key));

const NumberIsFinite: (v: any) => v is number =
	(Number as any).isFinite || (v => typeof v === 'number' && isFinite(v));

const isString = (v: any): v is string => typeof v === 'string';

const isBoolean = (v: any): v is boolean => v === true || v === false;

const isDate = (v: any): v is Date =>
	Object.prototype.toString.call(v) === '[object Date]';

const isObject = (v: any): v is AnyObject =>
	typeof v != null && typeof v === 'object';

const isValidOption = (
	key: string,
): key is keyof ODataOptionsWithoutCount & string => {
	return (
		key === '$filter' ||
		key === '$expand' ||
		key === '$orderby' ||
		key === '$top' ||
		key === '$skip' ||
		key === '$select'
	);
};
const encodedSlash = encodeURIComponent('/');
const encodedCount = encodeURIComponent('$count');
const trailingCountRegex = new RegExp(
	`(?:(?:${encodedSlash})|/)${encodedCount}$`,
);

interface PollOnObj {
	unsubscribe: () => void;
}
class Poll<T extends PromiseResultTypes> {
	private subscribers: {
		error: Array<(response: T) => void>;
		data: Array<(err: any) => void>;
	} = {
		error: [],
		data: [],
	};

	private stopped = false;
	private pollInterval?: ReturnType<typeof setTimeout>;

	private requestFn: null | (() => Promise<T>);

	constructor(requestFn: () => Promise<T>, private intervalTime = 10000) {
		this.requestFn = requestFn;
		this.start();
	}

	public setPollInterval(intervalTime: number) {
		this.intervalTime = intervalTime;
		this.restartTimeout();
	}

	public async runRequest() {
		if (this.stopped || this.requestFn == null) {
			return;
		}
		try {
			const response = await this.requestFn();
			if (this.stopped) {
				return;
			}
			this.restartTimeout();

			// Catch errors in event subscribers so that they don't trigger
			// the 'catch' below, and that subsequent subscribers will still
			// be called
			this.subscribers.data.forEach(fn => {
				try {
					fn(response);
				} catch (error) {
					console.error(
						'pinejs-client error: Caught error in data event subscription:',
						error,
					);
				}
			});
		} catch (err) {
			if (this.stopped) {
				return;
			}
			this.restartTimeout();

			this.subscribers.error.forEach(fn => {
				try {
					fn(err);
				} catch (error) {
					console.error(
						'pinejs-client error: Caught error in error event subscription:',
						error,
					);
				}
			});
		}
	}

	public on(name: 'data', fn: (response: Promise<T>) => void): PollOnObj;
	public on(name: 'error', fn: (err: any) => void): PollOnObj;
	public on(
		name: keyof Poll<T>['subscribers'],
		fn: (value: any) => void,
	): PollOnObj {
		const subscribers = this.subscribers[name] as Array<(value: any) => void>;
		const index = subscribers.push(fn) - 1;

		return {
			unsubscribe: () => delete this.subscribers[name][index],
		};
	}

	public start() {
		this.stopped = false;
		this.runRequest();
	}

	public stop() {
		if (this.pollInterval) {
			clearTimeout(this.pollInterval);
		}
		this.stopped = true;
	}

	public destroy() {
		this.stop();
		this.requestFn = null;
		this.subscribers.error.length = 0;
		this.subscribers.data.length = 0;
	}

	private restartTimeout() {
		if (this.stopped) {
			return;
		}
		if (this.pollInterval) {
			clearTimeout(this.pollInterval);
		}
		this.pollInterval = setTimeout(() => this.runRequest(), this.intervalTime);
	}
}

const isPrimitive = (value?: unknown): value is Primitive => {
	return (
		value === null ||
		isString(value) ||
		NumberIsFinite(value) ||
		isBoolean(value) ||
		isDate(value)
	);
};

// Escape a resource name (string), or resource path (array)
const escapeResource = (resource: string | string[]) => {
	if (isString(resource)) {
		resource = encodeURIComponent(resource);
	} else if (Array.isArray(resource)) {
		resource = resource.map(encodeURIComponent).join('/');
	} else {
		throw new Error('Not a valid resource: ' + typeof resource);
	}

	return resource.replace(trailingCountRegex, '/$count');
};

// Escape a primitive value
const escapeValue = (value: Primitive) => {
	if (isString(value)) {
		value = value.replace(/'/g, "''");
		return `'${encodeURIComponent(value)}'`;
	} else if (isDate(value)) {
		return `datetime'${value.toISOString()}'`;
	} else if (value === null || NumberIsFinite(value) || isBoolean(value)) {
		return value;
	} else {
		throw new Error('Not a valid value: ' + typeof value);
	}
};

const escapeParameterAlias = (value: unknown): string => {
	if (!isString(value)) {
		throw new Error(
			`Parameter alias reference must be a string, got: ${typeof value}`,
		);
	}
	return `@${encodeURIComponent(value)}`;
};

const join = (strOrArray: string | string[], separator = ',') => {
	if (isString(strOrArray)) {
		return strOrArray;
	} else if (Array.isArray(strOrArray)) {
		return strOrArray.join(separator);
	} else {
		throw new Error('Expected a string or array, got: ' + typeof strOrArray);
	}
};

// Join together a bunch of statements making sure the whole lot is correctly parenthesised
const bracketJoin = (arr: string[][], separator: string) => {
	if (arr.length === 1) {
		return arr[0];
	}
	const resultArr: string[] = [];
	arr
		.map(subArr => {
			if (subArr.length > 1) {
				return `(${subArr.join('')})`;
			}
			return subArr[0];
		})
		.forEach((str, i) => {
			if (i !== 0) {
				resultArr.push(separator);
			}
			resultArr.push(str);
		});
	return resultArr;
};

// Add the parentKey + operator if it exists.
const addParentKey = (
	filter: string[] | string | boolean | number | null,
	parentKey?: string[],
	operator = ' eq ',
) => {
	if (parentKey != null) {
		if (Array.isArray(filter)) {
			if (filter.length === 1) {
				filter = filter[0];
			} else {
				filter = `(${filter.join('')})`;
			}
		} else {
			filter = `${filter}`;
		}
		return [escapeResource(parentKey), operator, filter];
	}
	if (Array.isArray(filter)) {
		return filter;
	}
	return [`${filter}`];
};

const applyBinds = (
	filter: string,
	params: Dictionary<Filter>,
	parentKey?: string[],
) => {
	for (const index of Object.keys(params)) {
		const param = params[index];
		let paramStr = `(${buildFilter(param).join('')})`;
		// Escape $ for filter.replace
		paramStr = paramStr.replace(/\$/g, '$$$$');
		filter = filter.replace(
			new RegExp(`\\$${index}([^a-zA-Z0-9]|$)`, 'g'),
			`${paramStr}$1`,
		);
	}
	filter = `(${filter})`;
	return addParentKey(filter, parentKey);
};

const filterOperation = (
	filter: FilterOperationValue,
	operator: FilterOperationKey,
	parentKey?: string[],
) => {
	const op = ' ' + operator.slice(1) + ' ';
	if (isPrimitive(filter)) {
		const filterStr = escapeValue(filter);
		return addParentKey(filterStr, parentKey, op);
	} else if (Array.isArray(filter)) {
		const filterArr = handleFilterArray(filter);
		const filterStr = bracketJoin(filterArr, op);
		return addParentKey(filterStr, parentKey);
	} else if (isObject(filter)) {
		const result = handleFilterObject(filter);
		if (result.length < 1) {
			throw new Error(
				`${operator} objects must have at least 1 property, got: ${JSON.stringify(
					filter,
				)}`,
			);
		}
		if (result.length === 1) {
			return addParentKey(result[0], parentKey, op);
		} else {
			const filterStr = bracketJoin(result, op);
			return addParentKey(filterStr, parentKey);
		}
	} else {
		throw new Error(
			'Expected null/string/number/bool/obj/array, got: ' + typeof filter,
		);
	}
};
const filterFunction = (
	filter: FilterFunctionValue,
	fnIdentifier: FilterFunctionKey,
	parentKey?: string[],
): string[] => {
	const fnName = fnIdentifier.slice(1);
	if (isPrimitive(filter)) {
		const operands = [];
		if (parentKey != null) {
			operands.push(escapeResource(parentKey));
		}
		operands.push(escapeValue(filter));
		return [`${fnName}(${operands.join()})`];
	} else if (Array.isArray(filter)) {
		const filterArr = handleFilterArray(filter);
		let filterStr = filterArr.map(subArr => subArr.join('')).join(',');
		filterStr = `${fnName}(${filterStr})`;
		return addParentKey(filterStr, parentKey);
	} else if (isObject(filter)) {
		const filterArr = handleFilterObject(filter);
		let filterStr = filterArr.map(subArr => subArr.join('')).join(',');
		filterStr = `${fnName}(${filterStr})`;
		return addParentKey(filterStr, parentKey);
	} else {
		throw new Error(
			`Expected null/string/number/obj/array, got: ${typeof filter}`,
		);
	}
};

type FilterType<Operator extends keyof FilterObj> = NonNullable<
	FilterObj[Operator]
>;
// Handle special cases for all the different $ operators.
const handleFilterOperator = (
	filter: FilterObj[string],
	operator: keyof FilterObj,
	parentKey?: string[],
): string[] => {
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
			return filterOperation(
				filter as FilterType<typeof operator>,
				operator,
				parentKey,
			);
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
			return filterFunction(
				filter as FilterType<typeof operator>,
				operator,
				parentKey,
			);
		// break
		case '$raw': {
			filter = filter as FilterType<typeof operator>;
			if (isString(filter)) {
				filter = `(${filter})`;
				return addParentKey(filter, parentKey);
			} else if (!isPrimitive(filter)) {
				if (Array.isArray(filter)) {
					const [rawFilter, ...params] = filter;
					if (!isString(rawFilter)) {
						throw new Error(
							`First element of array for ${operator} must be a string, got: ${typeof rawFilter}`,
						);
					}
					const mappedParams: Dictionary<Filter> = {};
					for (let index = 0; index < params.length; index++) {
						mappedParams[index + 1] = params[index];
					}
					return applyBinds(rawFilter, mappedParams, parentKey);
				} else if (isObject(filter)) {
					const filterStr = filter.$string;
					if (!isString(filterStr)) {
						throw new Error(
							`$string element of object for ${operator} must be a string, got: ${typeof filterStr}`,
						);
					}
					const mappedParams: Dictionary<Filter> = {};
					for (const index in filter) {
						if (index !== '$string') {
							if (!/^[a-zA-Z0-9]+$/.test(index)) {
								throw new Error(
									`${operator} param names must contain only [a-zA-Z0-9], got: ${index}`,
								);
							}
							mappedParams[index] = filter[index] as Filter;
						}
					}
					return applyBinds(filterStr, mappedParams, parentKey);
				}
			}
			throw new Error(
				`Expected string/array/object for ${operator}, got: ${typeof filter}`,
			);
		}
		// break
		case '$': {
			const resource = escapeResource(filter as FilterType<typeof operator>);
			return addParentKey(resource, parentKey);
		}
		case '$count': {
			let keys = ['$count'];
			if (parentKey != null) {
				keys = parentKey.concat(keys);
			}
			return buildFilter(filter as Filter, keys);
		}
		// break
		case '$and':
		case '$or': {
			const filterStr = buildFilter(
				filter as FilterType<typeof operator>,
				undefined,
				` ${operator.slice(1)} `,
			);
			return addParentKey(filterStr, parentKey);
		}
		// break
		case '$in': {
			filter = filter as FilterType<typeof operator>;
			if (isPrimitive(filter)) {
				const filterStr = escapeValue(filter);
				return addParentKey(filterStr, parentKey, ' eq ');
			} else if (Array.isArray(filter)) {
				if (filter.every(isPrimitive)) {
					const filterStr = handleFilterArray(filter, undefined, 1);
					const inStr = bracketJoin(filterStr, ', ').join('');
					return addParentKey(`(${inStr})`, parentKey, ' in ');
				} else {
					const filterStr = handleFilterArray(filter, parentKey, 1);
					return bracketJoin(filterStr, ' or ');
				}
			} else if (isObject(filter)) {
				const filterArr = handleFilterObject(filter, parentKey);
				if (filterArr.length < 1) {
					throw new Error(
						`${operator} objects must have at least 1 property, got: ${JSON.stringify(
							filter,
						)}`,
					);
				}
				return bracketJoin(filterArr, ' or ');
			} else {
				throw new Error(
					`Expected null/string/number/bool/obj/array, got: ${typeof filter}`,
				);
			}
		}
		// break
		case '$not': {
			const filterStr = `not(${buildFilter(
				filter as FilterType<typeof operator>,
			).join('')})`;
			return addParentKey(filterStr, parentKey);
		}
		// break
		case '$any':
		case '$all': {
			filter = filter as FilterType<typeof operator>;
			const alias = filter.$alias;
			const expr = filter.$expr;
			if (alias == null) {
				throw new Error(
					`Lambda expression (${operator}) has no alias defined.`,
				);
			}
			if (expr == null) {
				throw new Error(`Lambda expression (${operator}) has no expr defined.`);
			}
			// Disable the expandFilter deprecation notice when inside a lambda expr
			const deprecatedFn = (deprecated.expandFilter = noop);
			let filterStr;
			try {
				filterStr = buildFilter(expr).join('');
			} finally {
				deprecated.expandFilter = deprecatedFn;
			}
			filterStr = `${operator.slice(1)}(${alias}:${filterStr})`;
			return addParentKey(filterStr, parentKey, '/');
		}
		// break
		default:
			throw new Error(`Unrecognised operator: '${operator}'`);
	}
};

const handleFilterObject = (filter: FilterObj, parentKey?: string[]) => {
	return mapObj(filter, (value, key) => {
		if (value === undefined) {
			throw new Error(
				`'${key}' was present on a filter object but undefined, did you mean to use null instead?`,
			);
		}
		if (key[0] === '$') {
			return handleFilterOperator(value, key, parentKey);
		} else if (key[0] === '@') {
			const parameterAlias = escapeParameterAlias(value);
			return addParentKey(parameterAlias, parentKey);
		} else {
			let keys = [key];
			if (parentKey != null) {
				if (parentKey.length > 0) {
					deprecated.expandFilter();
				}
				keys = parentKey.concat(keys);
			}
			return buildFilter(value as Filter, keys);
		}
	});
};

const handleFilterArray = (
	filter: FilterArray,
	parentKey?: string[],
	minElements = 2,
) => {
	if (filter.length < minElements) {
		throw new Error(
			`Filter arrays must have at least ${minElements} elements, got: ${JSON.stringify(
				filter,
			)}`,
		);
	}

	return filter.map(value => {
		return buildFilter(value, parentKey);
	});
};

// Turn a filter query object into an OData $filter string
const buildFilter = (
	filter: Filter,
	parentKey?: string[],
	joinStr?: string,
): string[] => {
	if (isPrimitive(filter)) {
		const filterStr = escapeValue(filter);
		return addParentKey(filterStr, parentKey);
	} else if (Array.isArray(filter)) {
		const filterArr = handleFilterArray(filter);
		const filterStr = bracketJoin(filterArr, joinStr ?? ' or ');
		return addParentKey(filterStr, parentKey);
	} else if (isObject(filter)) {
		const filterArr = handleFilterObject(filter, parentKey);
		return bracketJoin(filterArr, joinStr ?? ' and ');
	} else {
		throw new Error(
			`Expected null/string/number/obj/array, got: ${typeof filter}`,
		);
	}
};

const buildOrderBy = (orderby: OrderBy): string => {
	if (isString(orderby)) {
		return orderby;
	} else if (Array.isArray(orderby)) {
		if (orderby.length === 0) {
			throw new Error(`'$orderby' arrays have to have at least 1 element`);
		}
		const result = orderby.map(value => {
			if (Array.isArray(value)) {
				throw new Error(`'$orderby' cannot have nested arrays`);
			}
			return buildOrderBy(value);
		});
		return join(result);
	} else if (isObject(orderby)) {
		const result = mapObj(orderby, (dir, key) => {
			if (dir !== 'asc' && dir !== 'desc') {
				throw new Error(`'$orderby' direction must be 'asc' or 'desc'`);
			}
			return `${key} ${dir}`;
		});
		if (result.length !== 1) {
			throw new Error(
				`'$orderby' objects must have exactly one element, got ${result.length} elements`,
			);
		}
		return result[0];
	} else {
		throw new Error(
			`'$orderby' option has to be either a string, array, or object`,
		);
	}
};

const buildOption = (
	option: string,
	value: ODataOptionsWithoutCount[string],
) => {
	let compiledValue: string = '';
	switch (option) {
		case '$filter':
			compiledValue = buildFilter(value as Filter).join('');
			break;
		case '$expand':
			compiledValue = buildExpand(value as Expand);
			break;
		case '$orderby':
			compiledValue = buildOrderBy(value as OrderBy);
			break;
		case '$top':
		case '$skip':
			const num = value;
			if (!NumberIsFinite(num)) {
				throw new Error(`'${option}' option has to be a number`);
			}
			compiledValue = '' + num;
			break;
		case '$select':
			const select = value;
			if (isString(select)) {
				compiledValue = join(select);
			} else if (Array.isArray(select)) {
				if (select.length === 0) {
					throw new Error(`'${option}' arrays have to have at least 1 element`);
				}
				compiledValue = join(select as string[]);
			} else {
				throw new Error(
					`'${option}' option has to be either a string or array`,
				);
			}
			break;
		default:
			// Escape parameter aliases as primitives
			if (option[0] === '@') {
				if (!isPrimitive(value)) {
					throw new Error(
						`Unknown type for parameter alias option '${option}': ${typeof value}`,
					);
				}
				compiledValue = '' + escapeValue(value);
			}
			// Unknown values are left as-is
			else if (Array.isArray(value)) {
				compiledValue = join(value as string[]);
			} else if (isString(value)) {
				compiledValue = value;
			} else if (isBoolean(value) || NumberIsFinite(value)) {
				compiledValue = value.toString();
			} else {
				throw new Error(`Unknown type for option ${typeof value}`);
			}
	}
	return `${option}=${compiledValue}`;
};

const handleExpandOptions = (
	expand: ODataOptions,
	parentKey: string,
): string => {
	if (expand.hasOwnProperty('$count')) {
		const keys = Object.keys(expand);
		if (keys.length > 1) {
			throw new Error(
				`When using '$expand: a: $count: ...' you can only specify $count, got: '${JSON.stringify(
					keys,
				)}'`,
			);
		}
		return handleExpandOptions(expand.$count!, parentKey + '/$count');
	}
	const expandOptions = mapObj(expand, (value, key) => {
		if (key[0] === '$') {
			if (!isValidOption(key)) {
				throw new Error(`Unknown key option '${key}'`);
			}
			return buildOption(key, value);
		} else {
			throw new Error(
				`'$expand: ${parentKey}: ${key}: ...' is invalid, use '$expand: ${parentKey}: $expand: ${key}: ...' instead.`,
			);
		}
	});
	let expandStr = expandOptions.join(';');
	if (expandStr.length > 0) {
		expandStr = `(${expandStr})`;
	}
	expandStr = escapeResource(parentKey) + expandStr;
	return expandStr;
};
const handleExpandObject = (expand: ResourceExpand) => {
	const expands = mapObj(expand, (value, key) => {
		if (key[0] === '$') {
			throw new Error(
				'Cannot have expand options without first expanding something!',
			);
		}
		if (isPrimitive(value)) {
			const jsonValue = JSON.stringify(value);
			throw new Error(
				`'$expand: ${key}: ${jsonValue}' is invalid, use '$expand: ${key}: $expand: ${jsonValue}' instead.`,
			);
		}
		if (Array.isArray(value)) {
			throw new Error(
				`'$expand: ${key}: [...]' is invalid, use '$expand: ${key}: {...}' instead.`,
			);
		}
		return handleExpandOptions(value, key);
	});
	return expands;
};

const handleExpandArray = (expands: Array<string | ResourceExpand>) => {
	if (expands.length < 1) {
		throw new Error(
			`Expand arrays must have at least 1 elements, got: ${JSON.stringify(
				expands,
			)}`,
		);
	}

	return expands.map(expand => {
		return buildExpand(expand);
	});
};

const buildExpand = (expand: Expand): string => {
	if (isPrimitive(expand)) {
		return escapeResource(expand);
	} else if (Array.isArray(expand)) {
		const expandStr = handleExpandArray(expand);
		return join(expandStr);
	} else if (isObject(expand)) {
		const expandStr = handleExpandObject(expand);
		return join(expandStr);
	} else {
		throw new Error(`Unknown type for expand '${typeof expand}'`);
	}
};

const validParams: SharedParam[] = [
	'apiPrefix',
	'passthrough',
	'passthroughByMethod',
];

export type PreparedFn<T extends Dictionary<ParameterAlias>, U> = (
	parameterAliases?: T,
	body?: Params['body'],
	passthrough?: Params['passthrough'],
) => U;

export abstract class PinejsClientCore<PinejsClient> {
	public apiPrefix: string = '/';
	public passthrough: AnyObject = {};
	public passthroughByMethod: AnyObject = {};
	public backendParams: AnyObject;

	// `backendParams` must be used by a backend for any additional parameters it may have.
	constructor(params: string | Params) {
		if (isString(params)) {
			params = { apiPrefix: params };
		}

		if (isObject(params)) {
			for (const validParam of validParams) {
				const value = params[validParam];
				if (value != null) {
					(this[validParam] as PinejsClientCore<
						PinejsClient
					>[typeof validParam]) = value;
				}
			}
		}
	}

	// `backendParams` must be used by a backend for any additional parameters it may have.
	public clone(
		params: string | Params,
		backendParams?: AnyObject,
	): PinejsClient {
		if (isString(params)) {
			params = { apiPrefix: params };
		}

		const cloneParams: typeof params = {};
		for (const validParam of validParams) {
			if (this[validParam] != null) {
				(cloneParams[validParam] as PinejsClientCore<
					PinejsClient
				>[typeof validParam]) = this[validParam];
			}

			const paramValue = params?.[validParam];
			if (paramValue != null) {
				(cloneParams[validParam] as PinejsClientCore<
					PinejsClient
				>[typeof validParam]) = paramValue;
			}
		}

		let cloneBackendParams: typeof backendParams = {};
		if (isObject(this.backendParams)) {
			cloneBackendParams = { ...this.backendParams };
		}
		if (isObject(backendParams)) {
			cloneBackendParams = { ...cloneBackendParams, ...backendParams };
		}
		return new (this.constructor as new (
			params: Params,
			backendParams: AnyObject,
		) => PinejsClient)(cloneParams, cloneBackendParams);
	}

	public async get(
		params: Params & { id: NonNullable<Params['id']> },
	): Promise<number | AnyObject>;
	public async get(params: Omit<Params, 'id'>): Promise<number | AnyObject[]>;
	public async get(params: Params): Promise<PromiseResultTypes> {
		if (isString(params)) {
			throw new Error(
				'`get(url)` is no longer supported, please use `get({ url })` instead.',
			);
		}
		params.method = 'GET';

		const result = await this.request(params);
		return this.transformGetResult(params)(result);
	}

	protected transformGetResult(
		params: Params & { id: NonNullable<Params['id']> },
	): (data: AnyObject) => number | AnyObject;
	protected transformGetResult(
		params: Omit<Params, 'id'>,
	): (data: AnyObject) => number | AnyObject[];
	protected transformGetResult(
		params: Params,
	): (data: AnyObject) => PromiseResultTypes {
		const singular = params.id != null;

		return data => {
			if (!isObject(data)) {
				throw new Error(`Response was not a JSON object: '${typeof data}'`);
			}
			if (data.d == null) {
				throw new Error(
					"Invalid response received, the 'd' property is missing.",
				);
			}
			if (singular) {
				if (data.d.length > 1) {
					throw new Error(
						'Returned multiple results when only one was expected.',
					);
				}
				return data.d[0];
			}
			return data.d;
		};
	}

	public subscribe(
		params: SubscribeParams & { id: NonNullable<SubscribeParams['id']> },
	): Poll<number | AnyObject>;
	public subscribe(
		SubscribeParams: Omit<SubscribeParams, 'id'>,
	): Poll<number | AnyObject[]>;
	public subscribe(params: SubscribeParams): Poll<PromiseResultTypes> {
		if (isString(params)) {
			throw new Error(
				'`subscribe(url)` is no longer supported, please use `subscribe({ url })` instead.',
			);
		}

		const { pollInterval } = params;

		const requestFn = this.prepare(params);

		return new Poll(requestFn, pollInterval);
	}

	public put(params: Params) {
		if (isString(params)) {
			throw new Error(
				'`put(url)` is no longer supported, please use `put({ url })` instead.',
			);
		}
		params.method = 'PUT';
		return this.request(params);
	}

	public patch(params: Params) {
		if (isString(params)) {
			throw new Error(
				'`patch(url)` is no longer supported, please use `patch({ url })` instead.',
			);
		}
		params.method = 'PATCH';
		return this.request(params);
	}

	public post(params: Params) {
		if (isString(params)) {
			throw new Error(
				'`post(url)` is no longer supported, please use `post({ url })` instead.',
			);
		}
		params.method = 'POST';
		return this.request(params);
	}

	public delete(params: Params) {
		if (isString(params)) {
			throw new Error(
				'`delete(url)` is no longer supported, please use `delete({ url })` instead.',
			);
		}
		params.method = 'DELETE';
		return this.request(params);
	}

	public async upsert(params: UpsertParams) {
		const { id, body, ...restParams } = params;

		if (!isObject(id)) {
			throw new Error('The id property must be an object');
		}

		const naturalKeyProps = Object.keys(params.id);
		if (naturalKeyProps.length === 0) {
			throw new Error(
				'The id property must be an object with the natural key of the model',
			);
		}

		if (body == null) {
			throw new Error('The body property is missing');
		}

		const postParams = {
			...restParams,
			body: {
				...body,
				...id,
			},
		};
		try {
			await this.post(postParams);
		} catch (err) {
			const isUniqueKeyViolationResponse =
				err.statusCode === 409 && /unique/i.test(err.body);

			if (!isUniqueKeyViolationResponse) {
				throw err;
			}

			const { options } = restParams;
			const $filter =
				options?.$filter == null ? id : { $and: [options.$filter, id] };

			const patchParams = {
				...restParams,
				options: {
					...options,
					$filter,
				},
				body,
			};
			return this.patch(patchParams);
		}
	}

	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & { method?: 'GET'; id: NonNullable<Params['id']> },
	): PreparedFn<T, Promise<number | AnyObject>>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Omit<Params, 'id'> & { method?: 'GET' },
	): PreparedFn<T, Promise<number | AnyObject[]>>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & { method?: 'GET' },
	): PreparedFn<T, Promise<PromiseResultTypes>>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & {
			method: Exclude<Params['method'], 'GET'>;
		},
	): PreparedFn<T, Promise<{}>>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params,
	): PreparedFn<T, Promise<{}> | Promise<PromiseResultTypes>> {
		if (isString(params)) {
			throw new Error(
				'`prepare(url)` is no longer supported, please use `prepare({ url })` instead.',
			);
		}
		// precompile the URL string to improve performance
		const compiledUrl = this.compile(params);
		const urlQueryParamsStr = compiledUrl.indexOf('?') === -1 ? '?' : '&';
		if (params.method == null) {
			params.method = 'GET';
		} else {
			params.method = params.method.toUpperCase() as typeof params.method;
		}
		const { body: defaultBody } = params;
		const { passthrough: defaultPassthrough } = params;

		const transformFn =
			params.method === 'GET' ? this.transformGetResult(params) : undefined;

		return async (parameterAliases, body, passthrough) => {
			if (body != null) {
				params.body = {
					...defaultBody,
					...body,
				};
			} else if (defaultBody != null) {
				params.body = { ...defaultBody };
			}
			if (passthrough != null) {
				params.passthrough = {
					...defaultPassthrough,
					...passthrough,
				};
			} else if (defaultPassthrough != null) {
				params.passthrough = { ...defaultPassthrough };
			}
			if (parameterAliases != null) {
				params.url =
					compiledUrl +
					urlQueryParamsStr +
					mapObj(parameterAliases, (value, option) => {
						if (!isPrimitive(value)) {
							throw new Error(
								`Unknown type for parameter alias option '${option}': ${typeof value}`,
							);
						}
						return `@${option}=${escapeValue(value)}`;
					}).join('&');
			} else {
				params.url = compiledUrl;
			}
			const result = await this.request(params);
			if (transformFn != null) {
				return transformFn(result);
			}
			return result;
		};
	}

	public compile(params: Params): string {
		if (isString(params)) {
			throw new Error('Params must be an object not a string');
		}
		if (params.url != null) {
			return params.url;
		} else {
			if (params.resource == null) {
				throw new Error('Either the url or resource must be specified.');
			}
			let url = escapeResource(params.resource);

			if (params.hasOwnProperty('id')) {
				const { id } = params;
				if (id == null) {
					throw new Error('If the id property is set it must be non-null');
				}
				let value: string;

				if (isObject(id) && !isDate(id)) {
					if ('@' in id) {
						value = escapeParameterAlias(id['@']);
					} else {
						value = mapObj(id, (v, k) => {
							const escapedValue =
								isObject(v) && '@' in v
									? escapeParameterAlias(v['@'])
									: escapeValue(v);
							return `${k}=${escapedValue}`;
						}).join(',');
					}
				} else {
					value = '' + escapeValue(id);
				}
				url += `(${value})`;
			}

			let queryOptions: string[] = [];
			if (params.options != null) {
				queryOptions = mapObj(params.options, (value, option) => {
					if (option[0] === '$' && !isValidOption(option)) {
						throw new Error(`Unknown odata option '${option}'`);
					}
					return buildOption(option, value);
				});
			}
			if ((params as any).customOptions != null) {
				throw new Error(
					'`customOptions` has been removed, use `options` instead.',
				);
			}
			if (queryOptions.length > 0) {
				url += '?' + queryOptions.join('&');
			}
			return url;
		}
	}

	public request(params: Params, overrides?: undefined): Promise<{}> {
		if (overrides !== undefined) {
			throw new Error(
				'request(params, overrides)` is unsupported, please use `request({ ...params, ...overrides })` instead.',
			);
		}

		if (isString(params)) {
			throw new Error(
				'`request(url)` is no longer supported, please use `request({ url })` instead.',
			);
		}
		let { method, apiPrefix } = params;
		const { body, passthrough = {} } = params;

		apiPrefix = apiPrefix ?? this.apiPrefix;
		const url = apiPrefix + this.compile(params);

		method = method ?? 'GET';
		method = method.toUpperCase() as typeof method;
		// Filter to prevent accidental parameter passthrough.
		const opts = {
			...this.passthrough,
			...(this.passthroughByMethod[method] ?? {}),
			...passthrough,
			url,
			body,
			method,
		};

		return this._request(opts);
	}

	public abstract _request(
		params: {
			method: string;
			url: string;
			body?: AnyObject;
		} & AnyObject,
	): Promise<{}>;
}

export type PromiseResultTypes = number | AnyObject | AnyObject[];

type FilterOperationKey =
	| '$ne'
	| '$eq'
	| '$gt'
	| '$ge'
	| '$lt'
	| '$le'
	| '$add'
	| '$sub'
	| '$mul'
	| '$div'
	| '$mod';
type FilterOperationValue = Filter;
type FilterFunctionKey =
	| '$contains'
	| '$endswith'
	| '$startswith'
	| '$length'
	| '$indexof'
	| '$substring'
	| '$tolower'
	| '$toupper'
	| '$trim'
	| '$concat'
	| '$year'
	| '$month'
	| '$day'
	| '$hour'
	| '$minute'
	| '$second'
	| '$fractionalseconds'
	| '$date'
	| '$time'
	| '$totaloffsetminutes'
	| '$now'
	| '$maxdatetime'
	| '$mindatetime'
	| '$totalseconds'
	| '$round'
	| '$floor'
	| '$ceiling'
	| '$isof'
	| '$cast';
type FilterFunctionValue = Filter;

export interface FilterObj extends Dictionary<Filter | Lambda | undefined> {
	'@'?: string;

	$raw?: RawFilter;

	$?: string | string[];

	$count?: Filter;

	$and?: Filter;
	$or?: Filter;

	$in?: Filter;

	$not?: Filter;

	$any?: Lambda;
	$all?: Lambda;

	// Filter operations
	$ne?: FilterOperationValue;
	$eq?: FilterOperationValue;
	$gt?: FilterOperationValue;
	$ge?: FilterOperationValue;
	$lt?: FilterOperationValue;
	$le?: FilterOperationValue;
	$add?: FilterOperationValue;
	$sub?: FilterOperationValue;
	$mul?: FilterOperationValue;
	$div?: FilterOperationValue;
	$mod?: FilterOperationValue;

	// Filter functions
	$contains?: FilterFunctionValue;
	$endswith?: FilterFunctionValue;
	$startswith?: FilterFunctionValue;
	$length?: FilterFunctionValue;
	$indexof?: FilterFunctionValue;
	$substring?: FilterFunctionValue;
	$tolower?: FilterFunctionValue;
	$toupper?: FilterFunctionValue;
	$trim?: FilterFunctionValue;
	$concat?: FilterFunctionValue;
	$year?: FilterFunctionValue;
	$month?: FilterFunctionValue;
	$day?: FilterFunctionValue;
	$hour?: FilterFunctionValue;
	$minute?: FilterFunctionValue;
	$second?: FilterFunctionValue;
	$fractionalseconds?: FilterFunctionValue;
	$date?: FilterFunctionValue;
	$time?: FilterFunctionValue;
	$totaloffsetminutes?: FilterFunctionValue;
	$now?: FilterFunctionValue;
	$maxdatetime?: FilterFunctionValue;
	$mindatetime?: FilterFunctionValue;
	$totalseconds?: FilterFunctionValue;
	$round?: FilterFunctionValue;
	$floor?: FilterFunctionValue;
	$ceiling?: FilterFunctionValue;
	$isof?: FilterFunctionValue;
	$cast?: FilterFunctionValue;
}

export interface FilterArray extends Array<Filter> {}
export type FilterBaseType = string | number | null | boolean | Date;
export type RawFilter =
	| string
	| [string, ...Filter[]]
	| {
			$string: string;
			[index: string]: Filter;
	  };
export interface Lambda {
	$alias: string;
	$expr: Filter;
}
export type Filter = FilterObj | FilterArray | FilterBaseType;

export interface ResourceExpand extends Dictionary<ODataOptions> {}

export type Expand = string | ResourceExpand | Array<string | ResourceExpand>;

export type OrderBy =
	| string
	| string[]
	| {
			[index: string]: 'asc' | 'desc';
	  };

export type Primitive = null | string | number | boolean | Date;
export type ParameterAlias = Primitive;

export interface ODataOptionsWithoutCount {
	$filter?: Filter;
	$expand?: Expand;
	$orderby?: OrderBy;
	$top?: number;
	$skip?: number;
	$select?: string | string[];
	[index: string]:
		| undefined
		| ParameterAlias
		| string[]
		| Filter
		| Expand
		| OrderBy;
}
export interface ODataOptions extends ODataOptionsWithoutCount {
	$count?: ODataOptionsWithoutCount;
}
export type OptionsObject = ODataOptions;

export type ODataMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type BaseResourceId =
	| string
	| number
	| Date
	| {
			'@': string;
	  };
type ResourceId =
	| BaseResourceId
	| {
			[key: string]: BaseResourceId;
	  };

type SharedParam = 'apiPrefix' | 'passthrough' | 'passthroughByMethod';

export type AnyObject = Dictionary<any>;

export interface Params {
	apiPrefix?: string;
	method?: ODataMethod;
	resource?: string;
	id?: ResourceId;
	url?: string;
	body?: AnyObject;
	passthrough?: AnyObject;
	passthroughByMethod?: { [method in ODataMethod]: AnyObject };
	options?: ODataOptionsWithoutCount;
}

export interface SubscribeParams extends Params {
	method?: 'GET';
	pollInterval?: number;
}

export interface UpsertParams extends Omit<Params, 'id' | 'method'> {
	id: Dictionary<Primitive>;
	resource: string;
	body: AnyObject;
}
