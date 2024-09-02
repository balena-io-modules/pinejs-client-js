function isArray(value: any): value is readonly unknown[] {
	// See: https://github.com/microsoft/TypeScript/issues/17002
	return Array.isArray(value);
}

import type {
	PickDeferred,
	Expanded,
	Resource,
} from '@balena/abstract-sql-to-typescript';

export type { Resource };

type ResourceName = `${Letter | Digit}${string}`;

export type AnyResourceObject = {
	[key: ResourceName]: any;
};
export type AnyResource = {
	Read: AnyObject;
	Write: AnyObject;
};

type StringKeyOf<T> = keyof T & string;

export type ExpandableStringKeyOf<T extends Resource['Read']> = StringKeyOf<
	ResourceExpand<T>
>;
type ExtractExpand<T extends Resource['Read'], U extends keyof T> = NonNullable<
	Extract<T[U], ReadonlyArray<Resource['Read']>>[number]
>;
type SelectPropsOf<T extends Resource['Read'], U extends ODataOptions<T>> =
	U['$select'] extends ReadonlyArray<StringKeyOf<T>>
		? U['$select'][number]
		: U['$select'] extends StringKeyOf<T>
			? U['$select']
			: // If no $select is provided, all properties that are not $expanded are selected
				Exclude<StringKeyOf<T>, ExpandPropsOf<T, U>>;
type ExpandPropsOf<
	T extends Resource['Read'],
	U extends ODataOptions<T>,
> = U['$expand'] extends { [key in StringKeyOf<T>]?: any }
	? StringKeyOf<U['$expand']>
	: U['$expand'] extends ReadonlyArray<StringKeyOf<T>>
		? U['$expand'][number]
		: // If no $expand is provided, no properties are expanded
			never;
type ExpandToResponse<
	T extends Resource['Read'],
	U extends ODataOptions<T>,
> = U['$expand'] extends { [key in StringKeyOf<T>]?: any }
	? {
			[P in keyof U['$expand']]-?: OptionsToResponse<
				Expanded<T[P & string]>[number],
				U['$expand'][P],
				undefined
			>;
		}
	: U['$expand'] extends ReadonlyArray<StringKeyOf<T>>
		? {
				[P in U['$expand'][number]]-?: Array<
					PickDeferred<Expanded<T[P]>[number]>
				>;
			}
		: // If no $expand is provided, no properties are expanded
			// eslint-disable-next-line @typescript-eslint/ban-types -- We do want an empty object but `Record<string, never>` doesn't work because things breaks after it's used in a union, needs investigation
			{};

// Check if two types are exactly equal, useful for checking against eg exactly `any`
type Equals<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;

type OptionsToResponse<
	T extends Resource['Read'],
	U extends ODataOptions<T>,
	ID extends ResourceId<T> | undefined,
> = U extends {
	$count: ODataOptions<T>['$count'];
}
	? number
	: Equals<ID, any> extends true
		?
				| (PickDeferred<T, SelectPropsOf<T, U>> & ExpandToResponse<T, U>)
				| undefined
		: ID extends ResourceId<T>
			?
					| (PickDeferred<T, SelectPropsOf<T, U>> & ExpandToResponse<T, U>)
					| undefined
			: Array<PickDeferred<T, SelectPropsOf<T, U>> & ExpandToResponse<T, U>>;

export interface Dictionary<T> {
	[index: string]: T;
}

type LowerLetter =
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z';
type UpperLetter =
	| 'A'
	| 'B'
	| 'C'
	| 'D'
	| 'E'
	| 'F'
	| 'G'
	| 'H'
	| 'I'
	| 'J'
	| 'K'
	| 'L'
	| 'M'
	| 'N'
	| 'O'
	| 'P'
	| 'Q'
	| 'R'
	| 'S'
	| 'T'
	| 'U'
	| 'V'
	| 'W'
	| 'X'
	| 'Y'
	| 'Z';
type Letter = LowerLetter | UpperLetter;
type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const noop = (): void => {
	// noop
};
const deprecated = (() => {
	const deprecationMessages = {
		expandFilter:
			'`$filter: a: b: ...` is deprecated, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
		countInResource:
			"'`resource: 'a/$count'` is deprecated, please use `options: { $count: { ... } }` instead.",
		countInExpand:
			"'`$expand: { 'a/$count': {...} }` is deprecated, please use `$expand: { a: { $count: {...} } }` instead.",
		countWithNestedOperationInFilter:
			"'`$filter: { a: { $count: { $op: number } } }` is deprecated, please use `$filter: { $eq: [ { a: { $count: {} } }, number ] }` instead.",
		countInOrderBy:
			"'`$orderby: 'a/$count'` is deprecated, please use `$orderby: { a: { $count: {...} } }` instead.",
		non$filterOptionIn$expand$count:
			'using OData options other than $filter in a `$expand: { a: { $count: {...} } }` is deprecated, please remove them.',
		urlInGetOrCreate:
			'Passing `url` to `getOrCreate` is deprecated as it is unsupported and may have adverse effects, please use a query object instead.',
		urlInUpsert:
			'Passing `url` to `upsert` is deprecated as it is unsupported and may have adverse effects, please use a query object instead.',
		urlInCompile:
			'Passing `url` to `compile` is deprecated, please use a query object instead or use `request` directly.',
		urlInGet:
			'Passing `url` to `get` is deprecated, please use a query object instead or use `request` directly.',
		urlInPost:
			'Passing `url` to `post` is deprecated, please use a query object instead or use `request` directly.',
		urlInPatch:
			'Passing `url` to `patch` is deprecated, please use a query object instead or use `request` directly.',
		urlInPut:
			'Passing `url` to `put` is deprecated, please use a query object instead or use `request` directly.',
		urlInDelete:
			'Passing `url` to `delete` is deprecated, please use a query object instead or use `request` directly.',
	};
	const result = {} as Record<keyof typeof deprecationMessages, () => void>;
	for (const key of Object.keys(deprecationMessages) as Array<
		keyof typeof deprecationMessages
	>) {
		result[key] = () => {
			console.warn('pinejs-client deprecated:', deprecationMessages[key]);
			result[key] = noop;
		};
	}
	return result;
})();

const mapObj = <T extends Dictionary<any>, R>(
	obj: T,
	fn: (value: T[StringKeyOf<T>], key: StringKeyOf<T>) => R,
): R[] => Object.keys(obj).map((key: StringKeyOf<T>) => fn(obj[key], key));

const NumberIsFinite: (v: any) => v is number =
	(Number as any).isFinite || ((v) => typeof v === 'number' && isFinite(v));

const isString = (v: any): v is string => typeof v === 'string';

const isBoolean = (v: any): v is boolean => v === true || v === false;

const isDate = (v: any): v is Date =>
	Object.prototype.toString.call(v) === '[object Date]';

const isObject = (v: unknown): v is object =>
	v != null && typeof v === 'object';

const isValidOption = <T extends Resource>(
	key: string,
): key is StringKeyOf<ODataOptionsWithoutCount<T['Read']>> => {
	return (
		key === '$select' ||
		key === '$filter' ||
		key === '$expand' ||
		key === '$orderby' ||
		key === '$top' ||
		key === '$skip' ||
		key === '$format'
	);
};
const encodedSlash = encodeURIComponent('/');
const encodedCount = encodeURIComponent('$count');
const trailingCountRegex = new RegExp(
	`(?:(?:${encodedSlash})|/)${encodedCount}$`,
);

const ODataOptionCodeExampleMap = {
	$filter: '$filter: a: $op: [b: $count: ... ]',
	$expand: '$expand: a: $count: ...',
	$orderby: "$orderby: { a: { $count: ... }, $dir: 'asc' }",
};

const durationTimepartFlagEntries = [
	['hours', 'H'],
	['minutes', 'M'],
	['seconds', 'S'],
] as const;

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

	constructor(
		requestFn: () => Promise<T>,
		private intervalTime = 10000,
	) {
		this.requestFn = requestFn;
		this.start();
	}

	public setPollInterval(intervalTime: number): void {
		this.intervalTime = intervalTime;
		this.restartTimeout();
	}

	public async runRequest(): Promise<void> {
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
			this.subscribers.data.forEach((fn) => {
				try {
					fn(response);
				} catch (error) {
					console.error(
						'pinejs-client error: Caught error in data event subscription:',
						error,
					);
				}
			});
		} catch (err: any) {
			if (this.stopped) {
				return;
			}
			this.restartTimeout();

			this.subscribers.error.forEach((fn) => {
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

	public start(): void {
		this.stopped = false;
		void this.runRequest();
	}

	public stop(): void {
		if (this.pollInterval) {
			clearTimeout(this.pollInterval);
		}
		this.stopped = true;
	}

	public destroy(): void {
		this.stop();
		this.requestFn = null;
		this.subscribers.error.length = 0;
		this.subscribers.data.length = 0;
	}

	private restartTimeout(): void {
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
const escapeResource = (resource: string | string[]): string => {
	if (isString(resource)) {
		resource = encodeURIComponent(resource);
	} else if (isArray(resource)) {
		resource = resource.map(encodeURIComponent).join('/');
	} else {
		throw new Error('Not a valid resource: ' + typeof resource);
	}

	return resource.replace(trailingCountRegex, '/$count');
};

// Escape a primitive value
const escapeValue = (value: Primitive): string | number | boolean | null => {
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

const join = (strOrArray: string | string[], separator = ','): string => {
	if (isString(strOrArray)) {
		return strOrArray;
	} else if (isArray(strOrArray)) {
		return strOrArray.join(separator);
	} else {
		throw new Error('Expected a string or array, got: ' + typeof strOrArray);
	}
};

// Join together a bunch of statements making sure the whole lot is correctly parenthesised
const bracketJoin = (arr: string[][], separator: string): string[] => {
	if (arr.length === 1) {
		return arr[0];
	}
	const resultArr: string[] = [];
	arr
		.map((subArr) => {
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
): string[] => {
	if (parentKey != null) {
		if (isArray(filter)) {
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
	if (isArray(filter)) {
		return filter;
	}
	return [`${filter}`];
};

const applyBinds = <T extends Resource['Read']>(
	filter: string,
	params: Dictionary<Filter<T>>,
	parentKey?: string[],
): string[] => {
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

const filterOperation = <T extends Resource['Read']>(
	filter: FilterOperationValue<T>,
	operator: FilterOperationKey,
	parentKey?: string[],
): string[] => {
	const op = ' ' + operator.slice(1) + ' ';
	if (isPrimitive(filter)) {
		const filterStr = escapeValue(filter);
		return addParentKey(filterStr, parentKey, op);
	} else if (isArray(filter)) {
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
const filterFunction = <T extends Resource['Read']>(
	filter: FilterFunctionValue<T>,
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
	} else if (isArray(filter)) {
		const filterArr = handleFilterArray(filter);
		let filterStr = filterArr.map((subArr) => subArr.join('')).join(',');
		filterStr = `${fnName}(${filterStr})`;
		return addParentKey(filterStr, parentKey);
	} else if (isObject(filter)) {
		const filterArr = handleFilterObject(filter);
		let filterStr = filterArr.map((subArr) => subArr.join('')).join(',');
		filterStr = `${fnName}(${filterStr})`;
		return addParentKey(filterStr, parentKey);
	} else {
		throw new Error(
			`Expected null/string/number/obj/array, got: ${typeof filter}`,
		);
	}
};

type FilterType<
	Operator extends keyof AllFilterOperations<T>,
	T extends Resource['Read'],
> = NonNullable<AllFilterOperations<T>[Operator]>;
// Handle special cases for all the different $ operators.
const handleFilterOperator = <
	T extends Resource['Read'],
	U extends AllFilterOperations<T>,
>(
	filter: AllFilterOperations<T>[keyof AllFilterOperations<T>],
	operator: keyof AllFilterOperations<T>,
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
				filter as FilterType<typeof operator, T>,
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
				filter as FilterType<typeof operator, T>,
				operator,
				parentKey,
			);
		case '$duration': {
			const durationValue = filter as DurationValue;
			if (!isObject(durationValue)) {
				throw new Error(`Expected type for ${operator}, got: ${typeof filter}`);
			}
			let durationString = 'P';
			if (durationValue.days) {
				durationString += `${durationValue.days}D`;
			}

			let timePart = '';
			for (const [partKey, partFlag] of durationTimepartFlagEntries) {
				if (durationValue[partKey]) {
					timePart += `${durationValue[partKey]}${partFlag}`;
				}
			}
			if (timePart.length > 0) {
				durationString += `T${timePart}`;
			}

			if (durationString.length <= 1) {
				throw new Error(
					`Expected ${operator} to include duration properties, got: ${typeof filter}`,
				);
			}
			if (durationValue.negative) {
				durationString = `-${durationString}`;
			}
			return addParentKey(`duration'${durationString}'`, parentKey);
		}
		// break
		case '$raw': {
			const filterx = filter as U[typeof operator];
			if (isString(filterx)) {
				return addParentKey(`(${filterx})`, parentKey);
			} else if (!isPrimitive(filterx)) {
				// This needs to use the mutable version `Array.isArray` or otherwise the destructuring gets the wrong types?
				if (Array.isArray(filterx)) {
					const [rawFilter, ...params] = filterx;
					if (!isString(rawFilter)) {
						throw new Error(
							`First element of array for ${operator} must be a string, got: ${typeof rawFilter}`,
						);
					}
					const mappedParams: Dictionary<Filter<T>> = {};
					for (let index = 0; index < params.length; index++) {
						mappedParams[index + 1] = params[index];
					}
					return applyBinds(rawFilter, mappedParams, parentKey);
				} else if (isObject(filterx)) {
					const filterStr = filterx.$string;
					if (!isString(filterStr)) {
						throw new Error(
							`$string element of object for ${operator} must be a string, got: ${typeof filterStr}`,
						);
					}
					const mappedParams: Dictionary<Filter<T>> = {};
					for (const index in filterx) {
						if (index !== '$string') {
							if (!/^[a-zA-Z0-9]+$/.test(index)) {
								throw new Error(
									`${operator} param names must contain only [a-zA-Z0-9], got: ${index}`,
								);
							}
							mappedParams[index] = filterx[index as ResourceName];
						}
					}
					return applyBinds(filterStr, mappedParams, parentKey);
				}
			}
			throw new Error(
				`Expected string/array/object for ${operator}, got: ${typeof filterx}`,
			);
		}
		// break
		case '$': {
			const resource = escapeResource(filter as FilterType<typeof operator, T>);
			return addParentKey(resource, parentKey);
		}
		case '$count': {
			let keys = ['$count'];
			if (
				parentKey != null &&
				isObject(filter) &&
				// Handles the `$filter: $op: [ {a: {$count: {'...'}}}, value]`` case.
				(Object.keys(filter).length === 0 ||
					Object.prototype.hasOwnProperty.call(filter, '$filter'))
			) {
				keys = parentKey.slice(0, parentKey.length - 1);
				keys.push(
					handleOptions(
						'$filter',
						{ $count: filter as { $filter?: Filter<T> } },
						parentKey[parentKey.length - 1],
					),
				);
				return [keys.join('/')];
			}
			if (parentKey != null) {
				keys = parentKey.concat(keys);
			}
			// Handles the `$filter: a: $count: value` case.
			deprecated.countWithNestedOperationInFilter();
			return buildFilter(filter as Filter<T>, keys);
		}
		// break
		case '$and':
		case '$or': {
			const filterStr = buildFilter(
				filter as FilterType<typeof operator, T>,
				undefined,
				` ${operator.slice(1)} `,
			);
			return addParentKey(filterStr, parentKey);
		}
		// break
		case '$in': {
			filter = filter as FilterType<typeof operator, T>;
			if (isPrimitive(filter)) {
				const filterStr = escapeValue(filter);
				return addParentKey(filterStr, parentKey, ' eq ');
			} else if (isArray(filter)) {
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
				filter as FilterType<typeof operator, T>,
			).join('')})`;
			return addParentKey(filterStr, parentKey);
		}
		// break
		case '$any':
		case '$all': {
			const filterx = filter as FilterType<typeof operator, T>;
			const alias = filterx.$alias;
			const expr = filterx.$expr;
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

const handleFilterObject = <T extends Resource['Read']>(
	filter: FilterObj<T>,
	parentKey?: string[],
): string[][] => {
	return mapObj(filter, (value, key) => {
		if (value === undefined) {
			throw new Error(
				`'${key}' was present on a filter object but undefined, did you mean to use null instead?`,
			);
		}
		if (key.startsWith('$')) {
			return handleFilterOperator(
				value,
				key as keyof AllFilterOperations<T>,
				parentKey,
			);
		} else if (key.startsWith('@')) {
			const parameterAlias = escapeParameterAlias(value);
			return addParentKey(parameterAlias, parentKey);
		} else {
			let keys: string[] = [key];
			if (parentKey != null) {
				if (parentKey.length > 0) {
					deprecated.expandFilter();
				}
				keys = parentKey.concat(keys);
			}
			return buildFilter(value, keys);
		}
	});
};

const handleFilterArray = <T extends Resource['Read']>(
	filter: FilterArray<T>,
	parentKey?: string[],
	minElements = 2,
): string[][] => {
	if (filter.length < minElements) {
		throw new Error(
			`Filter arrays must have at least ${minElements} elements, got: ${JSON.stringify(
				filter,
			)}`,
		);
	}

	return filter.map((value) => {
		return buildFilter(value, parentKey);
	});
};

// Turn a filter query object into an OData $filter string
const buildFilter = <T extends Resource['Read']>(
	filter: Filter<T>,
	parentKey?: string[],
	joinStr?: string,
): string[] => {
	if (isPrimitive(filter)) {
		const filterStr = escapeValue(filter);
		return addParentKey(filterStr, parentKey);
	} else if (isArray(filter)) {
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

const buildOrderBy = <T extends Resource['Read']>(
	orderby: OrderBy<T>,
): string => {
	if (isString(orderby)) {
		if (/\/\$count\b/.test(orderby)) {
			deprecated.countInOrderBy();
		}
		return orderby;
	} else if (isArray(orderby)) {
		if (orderby.length === 0) {
			throw new Error(`'$orderby' arrays have to have at least 1 element`);
		}
		const result = orderby.map((value) => {
			if (isArray(value)) {
				throw new Error(`'$orderby' cannot have nested arrays`);
			}
			return buildOrderBy(value);
		});
		return join(result);
	} else if (isObject(orderby)) {
		const { $dir, ...$orderby } = orderby;
		const result = mapObj($orderby as typeof orderby, (dirOrOptions, key) => {
			let propertyPath: string = key;
			let dir = $dir;
			if (dirOrOptions == null) {
				throw new Error(
					`Orderby object values must not be null, got null for ${key}`,
				);
			}
			if (typeof dirOrOptions === 'string') {
				dir = dirOrOptions;
			} else {
				const keys = Object.keys(dirOrOptions);
				if (
					!Object.prototype.hasOwnProperty.call(dirOrOptions, '$count') ||
					keys.length > 1
				) {
					throw new Error(
						`When using '${
							ODataOptionCodeExampleMap['$orderby']
						}' you can only specify $count, got: '${JSON.stringify(keys)}'`,
					);
				}
				propertyPath = handleOptions('$orderby', dirOrOptions, propertyPath);
			}

			if (dir == null) {
				throw new Error(
					`'$orderby' objects should either use the '{ a: 'asc' }' or the ${ODataOptionCodeExampleMap.$orderby} notation`,
				);
			}

			if (dir !== 'asc' && dir !== 'desc') {
				throw new Error(`'$orderby' direction must be 'asc' or 'desc'`);
			}
			return `${propertyPath} ${dir}`;
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

const buildOption = <T extends Resource['Read']>(
	option: string,
	value: ODataOptionsWithoutCount<T>[string],
): string => {
	let compiledValue = '';
	switch (option) {
		case '$filter':
			compiledValue = buildFilter(value as Filter<T>).join('');
			break;
		case '$expand':
			compiledValue = buildExpand(value as Expand<T>);
			break;
		case '$orderby':
			compiledValue = buildOrderBy(value as OrderBy<T>);
			break;
		case '$top':
		case '$skip': {
			const num = value;
			if (!NumberIsFinite(num)) {
				throw new Error(`'${option}' option has to be a number`);
			}
			compiledValue = '' + num;
			break;
		}
		case '$select': {
			const select = value;
			if (isString(select)) {
				compiledValue = join(select);
			} else if (isArray(select)) {
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
		}
		default:
			// Escape parameter aliases as primitives
			if (option.startsWith('@')) {
				if (!isPrimitive(value)) {
					throw new Error(
						`Unknown type for parameter alias option '${option}': ${typeof value}`,
					);
				}
				compiledValue = '' + escapeValue(value);
			}
			// Unknown values are left as-is
			else if (isArray(value)) {
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

const handleOptions = <T extends Resource['Read']>(
	optionOperation: keyof typeof ODataOptionCodeExampleMap,
	options: ODataOptions<T>,
	parentKey: string,
): string => {
	if (Object.prototype.hasOwnProperty.call(options, '$count')) {
		const keys = Object.keys(options);
		if (keys.length > 1) {
			throw new Error(
				`When using '${
					ODataOptionCodeExampleMap[optionOperation]
				}' you can only specify $count, got: '${JSON.stringify(keys)}'`,
			);
		}

		options = options.$count!;
		parentKey += '/$count';
		// Check whether there is anything else other than $filter in the $count
		// and error b/c it's invalid.
		if (
			Object.keys(options).length >
			(Object.prototype.hasOwnProperty.call(options, '$filter') ? 1 : 0)
		) {
			// TODO: Remove the optionOperation check in the next major,
			// so that it throws for all operators.
			if (optionOperation === '$expand') {
				deprecated.non$filterOptionIn$expand$count();
			} else {
				throw new Error(
					`When using '${
						ODataOptionCodeExampleMap[optionOperation]
					}' you can only specify $filter in the $count, got: '${JSON.stringify(
						Object.keys(options),
					)}'`,
				);
			}
		}
	}
	const optionsArray = mapObj(options, (value, key) => {
		if (key.startsWith('$')) {
			if (!isValidOption(key)) {
				throw new Error(`Unknown key option '${key}'`);
			}
			return buildOption(key, value);
		}
		if (optionOperation === '$expand') {
			throw new Error(
				`'$expand: ${parentKey}: ${key}: ...' is invalid, use '$expand: ${parentKey}: $expand: ${key}: ...' instead.`,
			);
		}
		throw new Error(
			`'${optionOperation}: ${parentKey}: ${key}: ...' is invalid.`,
		);
	});
	let optionsStr = optionsArray.join(';');
	if (optionsStr.length > 0) {
		optionsStr = `(${optionsStr})`;
	}
	optionsStr = escapeResource(parentKey) + optionsStr;
	return optionsStr;
};
const handleExpandObject = <T extends Resource['Read']>(
	expand: ResourceExpand<T>,
): string[] => {
	const expands = mapObj(expand, (value, key) => {
		if (key.startsWith('$')) {
			throw new Error(
				'Cannot have expand options without first expanding something!',
			);
		}
		if (value == null) {
			throw new Error(
				`Expand object values must not be null, got null for ${key}`,
			);
		}
		if (isPrimitive(value)) {
			const jsonValue = JSON.stringify(value);
			throw new Error(
				`'$expand: ${key}: ${jsonValue}' is invalid, use '$expand: ${key}: $expand: ${jsonValue}' instead.`,
			);
		}
		if (isArray(value)) {
			throw new Error(
				`'$expand: ${key}: [...]' is invalid, use '$expand: ${key}: {...}' instead.`,
			);
		}
		if (key.endsWith('/$count')) {
			deprecated.countInExpand();
		}
		return handleOptions('$expand', value, key);
	});
	return expands;
};

const handleExpandArray = <T extends Resource['Read']>(
	expands: ReadonlyArray<BaseExpand<T>>,
): string[] => {
	if (expands.length < 1) {
		throw new Error(
			`Expand arrays must have at least 1 elements, got: ${JSON.stringify(
				expands,
			)}`,
		);
	}

	return expands.map((expand) => {
		return buildExpand(expand);
	});
};

const buildExpand = <T extends Resource['Read']>(expand: Expand<T>): string => {
	if (isPrimitive(expand)) {
		return escapeResource(expand);
	} else if (isArray(expand)) {
		const expandStr = handleExpandArray(expand);
		return join(expandStr);
	} else if (isObject(expand)) {
		const expandStr = handleExpandObject(expand);
		return join(expandStr);
	} else {
		throw new Error(`Unknown type for expand '${typeof expand}'`);
	}
};

const getRetryAfterHeaderDelayMs = (
	getRetryAfterHeader: RetryParametersObj['getRetryAfterHeader'],
	err: unknown,
) => {
	const retryAfterRaw = getRetryAfterHeader?.(err);
	if (typeof retryAfterRaw !== 'string') {
		return;
	}

	// TODO: Add support for parsing and converting HTTP date format values to delay.
	const retryAfterSeconds = parseInt(retryAfterRaw, 10);
	if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 0) {
		return;
	}
	return retryAfterSeconds * 1000;
};

const validParams = [
	'apiPrefix',
	'passthrough',
	'passthroughByMethod',
	'retry',
] as const;

export type PreparedFn<
	T extends Dictionary<ParameterAlias>,
	U,
	TResource extends Resource = AnyResource,
> = (
	parameterAliases?: T,
	body?: Params<TResource>['body'],
	passthrough?: Params<TResource>['passthrough'],
) => U;

export type RetryParametersObj = {
	canRetry?: (err: any) => boolean;
	onRetry?: (
		prevErr: any,
		delayMs: number,
		attempt: number,
		maxAttempts: number,
	) => void;
	getRetryAfterHeader?: (err: unknown) => string | undefined;
	minDelayMs?: number;
	maxDelayMs?: number;
	maxAttempts?: number;
};
export type RetryParameters = RetryParametersObj | false;

export abstract class PinejsClientCore<
	/** @deprecated This was for the purposes of `clone` and we now use `this` for that */
	PinejsClient = unknown,
	Model extends { [key in keyof Model]: Resource } = {
		[key in string]: AnyResource;
	},
> {
	public apiPrefix = '/';
	public passthrough: AnyObject = {};
	public passthroughByMethod: AnyObject = {};
	public backendParams?: AnyObject;
	public retry: RetryParameters = false;

	// `backendParams` must be used by a backend for any additional parameters it may have.
	constructor(params: string | ConstructorParams) {
		if (isString(params)) {
			params = { apiPrefix: params };
		}

		if (isObject(params)) {
			for (const validParam of validParams) {
				const value = params[validParam];
				if (value != null) {
					(this[
						validParam
					] as PinejsClientCore<PinejsClient>[typeof validParam]) = value;
				}
			}
		}
	}

	private canRetryDefaultHandler(err: any) {
		const code = err?.statusCode;
		return code == null || code === 429 || (code >= 500 && code < 600);
	}

	protected async callWithRetry<T>(
		fnCall: () => Promise<T>,
		retry?: RetryParameters,
	): Promise<T> {
		// Explicitly passing retry as false disables retrying for this call.
		if (retry === false || (retry == null && this.retry === false)) {
			return await fnCall();
		}

		const retryDefaultParameters = this.retry || {};
		const retryParameters = retry ?? {};

		const minDelayMs =
			retryParameters.minDelayMs ?? retryDefaultParameters.minDelayMs;
		const maxDelayMs =
			retryParameters.maxDelayMs ?? retryDefaultParameters.maxDelayMs;
		const maxAttempts =
			retryParameters.maxAttempts ?? retryDefaultParameters.maxAttempts;

		if (minDelayMs == null || minDelayMs <= 0) {
			throw new Error(
				`pinejs-client minDelayMs must be a positive integer, got: '${minDelayMs}'`,
			);
		}
		if (maxDelayMs == null || maxDelayMs <= 0) {
			throw new Error(
				`pinejs-client maxDelayMs must be a positive integer, got: '${maxDelayMs}'`,
			);
		}
		if (maxAttempts == null || maxAttempts <= 0) {
			throw new Error(
				`pinejs-client maxAttempts be a positive integer, got: '${maxDelayMs}'`,
			);
		}
		if (minDelayMs > maxDelayMs) {
			throw new Error(
				'pinejs-client maxDelayMs must be greater than or equal to minDelayMs',
			);
		}

		const onRetryHandler =
			retryParameters.onRetry ?? retryDefaultParameters.onRetry;

		const getRetryAfterHeader =
			retryParameters.getRetryAfterHeader ??
			retryDefaultParameters.getRetryAfterHeader;

		let attempt = 1;

		const canRetryHandler =
			retryParameters.canRetry ??
			retryDefaultParameters.canRetry ??
			this.canRetryDefaultHandler;

		// eslint-disable-next-line no-constant-condition -- we handle retry logic/delaying within the loop
		while (true) {
			try {
				return await fnCall();
			} catch (err) {
				if (attempt >= maxAttempts || !canRetryHandler(err)) {
					throw err;
				}

				let delayMs = Math.min(2 ** (attempt - 1) * minDelayMs, maxDelayMs);

				// note that attempt is incremented before calling onRetryHandler because
				// retries effectively begin with attempt number 2.
				attempt++;
				const retryAfterDelayMs = getRetryAfterHeaderDelayMs(
					getRetryAfterHeader,
					err,
				);
				if (retryAfterDelayMs != null && retryAfterDelayMs > delayMs) {
					delayMs = retryAfterDelayMs;
				}
				onRetryHandler?.(err, delayMs, attempt, maxAttempts);
				await new Promise<void>((resolve) => {
					setTimeout(resolve, delayMs);
				});
			}
		}
	}

	// `backendParams` must be used by a backend for any additional parameters it may have.
	public clone(
		params: string | ConstructorParams,
		backendParams?: AnyObject,
	): this {
		if (isString(params)) {
			params = { apiPrefix: params };
		}

		const cloneParams: typeof params = {};
		for (const validParam of validParams) {
			if (this[validParam] != null) {
				(cloneParams[
					validParam
				] as PinejsClientCore<PinejsClient>[typeof validParam]) =
					this[validParam];
			}

			const paramValue = params?.[validParam];
			if (paramValue != null) {
				(cloneParams[
					validParam
				] as PinejsClientCore<PinejsClient>[typeof validParam]) = paramValue;
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
			$params: ConstructorParams,
			$backendParams: AnyObject,
		) => this)(cloneParams, cloneBackendParams);
	}

	public async get<
		TResource extends StringKeyOf<Model>,
		TParams extends Params<Model[TResource]> & {
			resource: TResource;
		},
	>(
		params: { resource: TResource } & TParams,
	): Promise<
		NoInfer<
			OptionsToResponse<
				Model[TResource]['Read'],
				NonNullable<TParams['options']>,
				TParams['id']
			>
		>
	>;
	/**
	 * @deprecated GETing via `url` is deprecated
	 */
	public get<T extends Resource = AnyResource>(
		params: {
			resource?: undefined;
			url: NonNullable<Params<T>['url']>;
		} & Params<T>,
	): Promise<PromiseResultTypes>;
	public async get(params: Params): Promise<PromiseResultTypes> {
		if (params.url != null) {
			deprecated.urlInGet();
		}

		const result = await this.request({ ...params, method: 'GET' });
		return this._transformGetResult(params, result);
	}

	protected _transformGetResult<T extends Resource>(
		params: Params<T> & {
			options: { $count: NonNullable<ODataOptions<T['Read']>['$count']> };
		},
		data: AnyObject,
	): number;
	protected _transformGetResult<T extends Resource>(
		params: Params<T> & { id: NonNullable<Params<T>['id']> },
		data: AnyObject,
	): AnyObject | undefined;
	protected _transformGetResult<T extends Resource>(
		params: Omit<Params<T>, 'id'>,
		data: AnyObject,
	): AnyObject[];
	protected _transformGetResult<T extends Resource>(
		params: Params<T>,
		data: AnyObject,
	): PromiseResultTypes {
		if (!isObject(data)) {
			throw new Error(`Response was not a JSON object: '${typeof data}'`);
		}
		if (data.d == null) {
			throw new Error(
				"Invalid response received, the 'd' property is missing.",
			);
		}
		if (params.id != null) {
			// singular
			if (data.d.length > 1) {
				throw new Error(
					'Returned multiple results when only one was expected.',
				);
			}
			return data.d[0];
		}
		return data.d;
	}

	// TODO: Change its interface to how _transformGetResult looks in the next major
	/** @deprecated */
	protected transformGetResult<T extends Resource>(
		params: Params<T> & {
			options: { $count: NonNullable<ODataOptions<T['Read']>['$count']> };
		},
	): (data: AnyObject) => number;
	protected transformGetResult<T extends Resource>(
		params: Params<T> & { id: NonNullable<Params<T>['id']> },
	): (data: AnyObject) => AnyObject | undefined;
	protected transformGetResult<T extends Resource>(
		params: Omit<Params<T>, 'id'>,
	): (data: AnyObject) => AnyObject[];
	protected transformGetResult<T extends Resource>(
		params: Params<T>,
	): (data: AnyObject) => PromiseResultTypes {
		return (data) => this._transformGetResult(params, data);
	}

	public subscribe<TResource extends StringKeyOf<Model>>(
		params: SubscribeParams<Model[TResource]> & {
			resource: TResource;
			options: {
				$count: NonNullable<ODataOptions<Model[TResource]['Read']>['$count']>;
			};
		},
	): Poll<number>;
	public subscribe<TResource extends StringKeyOf<Model>>(
		params: SubscribeParams<Model[TResource]> & {
			resource: TResource;
			id: NonNullable<SubscribeParams<Model[TResource]>['id']>;
		},
	): Poll<AnyObject | undefined>;
	public subscribe<TResource extends StringKeyOf<Model>>(
		params: Omit<SubscribeParams<Model[TResource]>, 'id'> & {
			resource: TResource;
		},
	): Poll<AnyObject[]>;
	public subscribe<TResource extends StringKeyOf<Model>>(
		params: SubscribeParams<Model[TResource]>,
	): Poll<PromiseResultTypes> {
		if (isString(params)) {
			throw new Error(
				'`subscribe(url)` is no longer supported, please use `subscribe({ url })` instead.',
			);
		}

		const { pollInterval } = params;

		const requestFn = this.prepare(params);

		return new Poll(requestFn, pollInterval);
	}

	public put<TResource extends StringKeyOf<Model>>(
		params: { resource: TResource; url?: undefined } & Params<Model[TResource]>,
	): Promise<void>;
	/**
	 * @deprecated PUTing via `url` is deprecated
	 */
	public put<T extends Resource = AnyResource>(
		params: {
			resource?: undefined;
			url: NonNullable<Params<T>['url']>;
		} & Params<T>,
	): Promise<void>;
	public put(params: Params): Promise<void> {
		if (params.url != null) {
			deprecated.urlInPut();
		}
		return this.request({ ...params, method: 'PUT' });
	}

	public patch<TResource extends StringKeyOf<Model>>(
		params: { resource: TResource; url?: undefined } & Params<Model[TResource]>,
	): Promise<void>;
	/**
	 * @deprecated PATCHing via `url` is deprecated
	 */
	public patch<T extends Resource = AnyResource>(
		params: {
			resource?: undefined;
			url: NonNullable<Params<T>['url']>;
		} & Params<T>,
	): Promise<void>;
	public patch(params: Params): Promise<void> {
		if (params.url != null) {
			deprecated.urlInPatch();
		}
		return this.request({ ...params, method: 'PATCH' });
	}

	public post<TResource extends StringKeyOf<Model>>(
		params: { resource: TResource } & Params<Model[TResource]>,
	): Promise<PickDeferred<Model[TResource]['Read']>>;
	/**
	 * @deprecated POSTing via `url` is deprecated
	 */
	public post<T extends Resource = AnyResource>(
		params: {
			resource?: undefined;
			url: NonNullable<Params<T>['url']>;
		} & Params<T>,
	): Promise<AnyObject>;
	public post(params: Params): Promise<AnyObject> {
		if (params.url != null) {
			deprecated.urlInPost();
		}
		return this.request({ ...params, method: 'POST' });
	}

	public delete<TResource extends StringKeyOf<Model>>(
		params: { resource: TResource } & Params<Model[TResource]>,
	): Promise<void>;
	/**
	 * @deprecated DELETEing via `url` is deprecated
	 */
	public delete<T extends Resource = AnyResource>(
		params: {
			resource?: undefined;
			url: NonNullable<Params<T>['url']>;
		} & Params<T>,
	): Promise<void>;
	public delete(params: Params): Promise<void> {
		if (params.url != null) {
			deprecated.urlInDelete();
		}
		params.method = 'DELETE';
		return this.request({ ...params, method: 'DELETE' });
	}

	public async getOrCreate<TResource extends StringKeyOf<Model>>(
		params: { resource: TResource } & GetOrCreateParams<Model[TResource]>,
	): Promise<AnyObject> {
		if ('url' in params && params.url != null) {
			deprecated.urlInGetOrCreate();
		}
		const { id, body, ...restParams } = params;

		if (params.resource.endsWith('/$count')) {
			throw new Error('getOrCreate does not support $count on resources');
		}

		if (body == null) {
			throw new Error('The body property is missing');
		}

		if (!isObject(id) || isDate(id) || Object.keys(id).length === 0) {
			throw new Error(
				'The id property must be an object with the natural key of the model',
			);
		}

		const result = await this.get({
			...restParams,
			id,
		});

		if (result != null) {
			return result;
		}

		return await this.post({
			...restParams,
			body: {
				...id,
				...body,
			},
		});
	}

	public async upsert<TResource extends StringKeyOf<Model>>(
		params: { resource: TResource; url?: undefined } & UpsertParams<
			Model[TResource]
		>,
	): Promise<undefined | AnyObject> {
		if ('url' in params && params.url != null) {
			deprecated.urlInUpsert();
		}
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
			return await this.post(postParams);
		} catch (err: any) {
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
			await this.patch(patchParams);
		}
	}

	public prepare<
		TAliases extends Dictionary<
			Array<'null' | 'string' | 'number' | 'boolean' | 'Date'>
		>,
		TResource extends StringKeyOf<Model>,
		TParams extends Params<Model[TResource]> & {
			resource: TResource;
		},
	>(
		params: {
			resource: TResource;
			method?: 'GET';
		} & TParams,
		/**
		 * If this is passed then all the listed aliases are expected to be used in params and passed to the returned prepared function.
		 */
		expectedAliases: TAliases,
	): PreparedFn<
		StringDictionaryToDictType<TAliases>,
		Promise<
			NoInfer<
				OptionsToResponse<
					Model[TResource]['Read'],
					NonNullable<TParams['options']>,
					TParams['id']
				>
			>
		>,
		Model[TResource]
	>;
	public prepare<
		T extends Dictionary<ParameterAlias>,
		TResource extends StringKeyOf<Model>,
		TParams extends Params<Model[TResource]> & {
			resource: TResource;
		},
	>(
		params: {
			resource: TResource;
			method?: 'GET';
		} & TParams,
	): PreparedFn<
		T,
		Promise<
			NoInfer<
				OptionsToResponse<
					Model[TResource]['Read'],
					NonNullable<TParams['options']>,
					TParams['id']
				>
			>
		>,
		Model[TResource]
	>;
	public prepare<
		T extends Dictionary<ParameterAlias>,
		TResource extends StringKeyOf<Model>,
	>(
		params: Params<Model[TResource]> & {
			resource: TResource;
			method?: 'GET';
			options: {
				$count: NonNullable<ODataOptions<Model[TResource]['Read']>['$count']>;
			};
		},
	): PreparedFn<T, Promise<number>, Model[TResource]>;
	// We have duplicates with only the parameter alias dictionary generic to support the case where only that generic typing is passed, since inferring generics is all or nothing in typescript atm
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & {
			method?: 'GET';
			options: {
				$count: NonNullable<ODataOptions<AnyResource['Read']>['$count']>;
			};
		},
	): PreparedFn<T, Promise<number>>;
	public prepare<
		T extends Dictionary<ParameterAlias>,
		TResource extends StringKeyOf<Model>,
	>(
		params: Params<Model[TResource]> & {
			resource: TResource;
			method?: 'GET';
			id: NonNullable<Params<Model[TResource]>['id']>;
		},
	): PreparedFn<T, Promise<AnyObject | undefined>, Model[TResource]>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & {
			method?: 'GET';
			id: NonNullable<Params['id']>;
		},
	): PreparedFn<T, Promise<AnyObject | undefined>>;
	public prepare<
		T extends Dictionary<ParameterAlias>,
		TResource extends StringKeyOf<Model>,
	>(
		params: Omit<Params<Model[TResource]>, 'id'> & {
			resource: TResource;
			method?: 'GET';
		},
	): PreparedFn<T, Promise<AnyObject[]>, Model[TResource]>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Omit<Params, 'id'> & {
			method?: 'GET';
		},
	): PreparedFn<T, Promise<AnyObject[]>>;
	public prepare<
		T extends Dictionary<ParameterAlias>,
		TResource extends StringKeyOf<Model>,
	>(
		params: Params<Model[TResource]> & {
			resource: TResource;
			method?: 'GET';
		},
	): PreparedFn<T, Promise<PromiseResultTypes>, Model[TResource]>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & {
			method?: 'GET';
		},
	): PreparedFn<T, Promise<PromiseResultTypes>>;
	public prepare<
		TAliases extends Dictionary<
			Array<'null' | 'string' | 'number' | 'boolean' | 'Date'>
		>,
		TResource extends StringKeyOf<Model>,
	>(
		params: Params<Model[TResource]> & {
			resource: TResource;
			method: 'PUT' | 'PATCH' | 'DELETE';
		},
		/**
		 * If this is passed then all the listed aliases are expected to be used in params and passed to the returned prepared function.
		 */
		expectedAliases: TAliases,
	): PreparedFn<
		StringDictionaryToDictType<TAliases>,
		Promise<undefined>,
		Model[TResource]
	>;
	public prepare<
		T extends Dictionary<ParameterAlias>,
		TResource extends StringKeyOf<Model>,
	>(
		params: Params<Model[TResource]> & {
			resource: TResource;
			method: 'PUT' | 'PATCH' | 'DELETE';
		},
	): PreparedFn<T, Promise<undefined>, Model[TResource]>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & {
			method: 'PUT' | 'PATCH' | 'DELETE';
		},
	): PreparedFn<T, Promise<undefined>>;
	public prepare<
		TAliases extends Dictionary<
			Array<'null' | 'string' | 'number' | 'boolean' | 'Date'>
		>,
		TResource extends StringKeyOf<Model>,
	>(
		params: Params<Model[TResource]> & {
			resource: TResource;
			method: 'POST';
		},
		/**
		 * If this is passed then all the listed aliases are expected to be used in params and passed to the returned prepared function.
		 */
		expectedAliases: TAliases,
	): PreparedFn<
		StringDictionaryToDictType<TAliases>,
		Promise<AnyObject>,
		Model[TResource]
	>;
	public prepare<
		T extends Dictionary<ParameterAlias>,
		TResource extends StringKeyOf<Model>,
	>(
		params: Params<Model[TResource]> & {
			resource: TResource;
			method: 'POST';
		},
	): PreparedFn<T, Promise<AnyObject>, Model[TResource]>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & {
			method: 'POST';
		},
	): PreparedFn<T, Promise<AnyObject>>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params & {
			resource?: undefined;
			method: 'POST';
		},
	): PreparedFn<T, Promise<AnyObject>>;
	public prepare<T extends Dictionary<ParameterAlias>>(
		params: Params,
	): PreparedFn<T, Promise<PromiseResultTypes | undefined>> {
		if (isString(params)) {
			throw new Error(
				'`prepare(url)` is no longer supported, please use `prepare({ url })` instead.',
			);
		}
		// precompile the URL string to improve performance
		const compiledUrl = params.url ?? this.compile(params);
		const urlQueryParamsStr = !compiledUrl.includes('?') ? '?' : '&';
		if (params.method == null) {
			params.method = 'GET';
		} else {
			params.method = params.method.toUpperCase() as typeof params.method;
		}
		const { body: defaultBody, passthrough: defaultPassthrough } = params;

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
			if (params.method === 'GET') {
				return this._transformGetResult(params, result as AnyObject);
			}
			return result;
		};
	}

	public compile<TResource extends StringKeyOf<Model>>(
		params: { resource: TResource } & Params<Model[TResource]>,
	): string;
	/**
	 * @deprecated Compiling a `url` is deprecated, it's a noop so you can just use the url directly
	 */
	public compile<T extends Resource = AnyResource>(
		params: {
			resource?: undefined;
			url: NonNullable<Params<T>['url']>;
		} & Params<T>,
	): string;
	public compile(params: Params): string;
	public compile(params: Params): string {
		if (isString(params)) {
			throw new Error('Params must be an object not a string');
		}
		if (params.url != null) {
			deprecated.urlInCompile();
			return params.url;
		} else {
			if (params.resource == null) {
				throw new Error('Either the url or resource must be specified.');
			}
			if (params.resource.endsWith('/$count')) {
				deprecated.countInResource();
			}
			let url = escapeResource(params.resource);
			let { options } = params;

			if (
				options != null &&
				Object.prototype.hasOwnProperty.call(options, '$count')
			) {
				const keys = Object.keys(options);
				if (keys.length > 1) {
					throw new Error(
						`When using '$expand: a: $count: ...' you can only specify $count, got: '${JSON.stringify(
							keys,
						)}'`,
					);
				}
				url += '/$count';
				options = options.$count as ODataOptionsWithoutCount<AnyObject>;
			}

			if (Object.prototype.hasOwnProperty.call(params, 'id')) {
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
									: escapeValue(v!);
							return `${k}=${escapedValue}`;
						}).join(',');
					}
				} else {
					value = '' + escapeValue(id);
				}
				url += `(${value})`;
			}

			let queryOptions: string[] = [];
			if (options != null) {
				queryOptions = mapObj(options, (value, option) => {
					if (option.startsWith('$') && !isValidOption(option)) {
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

	public request<T extends Resource>(
		params: Params<T> & {
			method?: 'GET';
			options: { $count: NonNullable<ODataOptions<T['Read']>['$count']> };
		},
	): Promise<{ d: number }>;
	public request<T extends Resource>(
		params: Params<T> & { method?: 'GET'; id: NonNullable<Params<T>['id']> },
	): Promise<{ d: AnyObject | undefined }>;
	public request<T extends Resource>(
		params: Omit<Params<T>, 'id'> & { method?: 'GET' },
	): Promise<{ d: AnyObject[] }>;
	public request<T extends Resource>(
		params: Params<T> & { method?: 'GET' },
	): Promise<{ d: PromiseResultTypes }>;
	public request<T extends Resource>(
		params: Params<T> & {
			method: 'PUT' | 'PATCH' | 'DELETE';
		},
	): Promise<undefined>;
	public request<T extends Resource>(
		params: Params<T> & {
			method: 'POST';
		},
	): Promise<AnyObject>;
	public request<T extends Resource>(
		params: Params<T>,
		overrides?: undefined,
	): Promise<PromiseResultTypes | undefined>;
	public request<T extends Resource>(
		params: Params<T>,
		overrides?: undefined,
	): Promise<PromiseResultTypes | undefined> {
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
		const { body, passthrough = {}, retry } = params;

		apiPrefix = apiPrefix ?? this.apiPrefix;
		const url = apiPrefix + (params.url ?? this.compile(params));

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

		// Do not await this._request result, so that we can preserve
		// the potentially enhanced promise-like result.
		return this.callWithRetry(() => this._request(opts), retry);
	}

	public abstract _request(
		params: {
			method: string;
			url: string;
			body?: AnyObject;
		} & AnyObject,
	): Promise<NonNullable<unknown>>;
}

export type PromiseResultTypes = number | AnyObject | AnyObject[] | undefined;

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
type FilterOperationValue<T extends Resource['Read']> = Filter<T>;
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
type FilterFunctionValue<T extends Resource['Read']> = Filter<T>;

type DurationValue = {
	negative?: boolean;
	days?: number;
	hours?: number;
	minutes?: number;
	seconds?: number;
};

export type NestedFilterOperations<
	T extends Resource['Read'],
	NestedKey extends StringKeyOf<T> = ExpandableStringKeyOf<T>,
> = {
	$count?: NestedKey extends ExpandableStringKeyOf<T>
		?
				| Filter<ExtractExpand<T, NestedKey>>
				| ODataCountOptions<ExtractExpand<T, NestedKey>>
		: never;

	$in?: Filter<T>;

	$any?: NestedKey extends ExpandableStringKeyOf<T>
		? Lambda<ExtractExpand<T, NestedKey>>
		: never;
	$all?: NestedKey extends ExpandableStringKeyOf<T>
		? Lambda<ExtractExpand<T, NestedKey>>
		: never;
};

type FilterOperations<T extends Resource['Read']> = {
	'@'?: string;

	$raw?: RawFilter<T>;

	$?: string | string[];

	$and?: Filter<T>;
	$or?: Filter<T>;

	$not?: Filter<T>;

	// Filter operations
	$ne?: FilterOperationValue<T>;
	$eq?: FilterOperationValue<T>;
	$gt?: FilterOperationValue<T>;
	$ge?: FilterOperationValue<T>;
	$lt?: FilterOperationValue<T>;
	$le?: FilterOperationValue<T>;
	$add?: FilterOperationValue<T>;
	$sub?: FilterOperationValue<T>;
	$mul?: FilterOperationValue<T>;
	$div?: FilterOperationValue<T>;
	$mod?: FilterOperationValue<T>;

	// Filter functions
	$contains?: FilterFunctionValue<T>;
	$endswith?: FilterFunctionValue<T>;
	$startswith?: FilterFunctionValue<T>;
	$length?: FilterFunctionValue<T>;
	$indexof?: FilterFunctionValue<T>;
	$substring?: FilterFunctionValue<T>;
	$tolower?: FilterFunctionValue<T>;
	$toupper?: FilterFunctionValue<T>;
	$trim?: FilterFunctionValue<T>;
	$concat?: FilterFunctionValue<T>;
	$year?: FilterFunctionValue<T>;
	$month?: FilterFunctionValue<T>;
	$day?: FilterFunctionValue<T>;
	$hour?: FilterFunctionValue<T>;
	$minute?: FilterFunctionValue<T>;
	$second?: FilterFunctionValue<T>;
	$fractionalseconds?: FilterFunctionValue<T>;
	$date?: FilterFunctionValue<T>;
	$time?: FilterFunctionValue<T>;
	$totaloffsetminutes?: FilterFunctionValue<T>;
	$now?: FilterFunctionValue<T>;
	$duration?: DurationValue;
	$maxdatetime?: FilterFunctionValue<T>;
	$mindatetime?: FilterFunctionValue<T>;
	$totalseconds?: FilterFunctionValue<T>;
	$round?: FilterFunctionValue<T>;
	$floor?: FilterFunctionValue<T>;
	$ceiling?: FilterFunctionValue<T>;
	$isof?: FilterFunctionValue<T>;
	$cast?: FilterFunctionValue<T>;
};

type AllFilterOperations<T extends Resource['Read']> = FilterOperations<T> &
	NestedFilterOperations<T>;

export type FilterObj<T extends Resource['Read'] = AnyResourceObject> = {
	[key in StringKeyOf<T>]?:
		| Filter<T>
		| NestedFilterOperations<T, key>
		| undefined;
} & FilterOperations<T>;

export type FilterArray<T extends Resource['Read'] = AnyResourceObject> =
	ReadonlyArray<Filter<T>>;
export type FilterBaseType = string | number | null | boolean | Date;
export type RawFilter<T extends Resource['Read'] = AnyResourceObject> =
	| string
	| [string, ...Array<Filter<T>>]
	| {
			$string: string;
			[index: ResourceName]: Filter<T>;
	  };

export interface Lambda<
	T extends Resource['Read'] = AnyResourceObject,
	Alias extends string = string,
> {
	// This alias can only be inferred when we are not passing any generic parameters so in
	// practice it has limited use but if/when typescript supports partial inference of generic
	// parameters it will become significantly more useful
	$alias: Alias;
	$expr: Filter<T & { [a in NoInfer<Alias>]: T }>;
}
export type Filter<T extends Resource['Read'] = AnyResourceObject> =
	| FilterObj<T>
	| FilterArray<T>
	| FilterBaseType;

export type ResourceExpand<T extends Resource['Read'] = AnyResourceObject> = {
	[resource in StringKeyOf<T> as ExtractExpand<T, resource> extends never
		? never
		: resource]?: ODataOptions<ExtractExpand<T, resource>>;
};

export type BaseExpand<T extends Resource['Read'] = AnyResourceObject> =
	| ExpandableStringKeyOf<T>
	| ResourceExpand<T>;
export type Expand<T extends Resource['Read'] = AnyResourceObject> =
	| BaseExpand<T>
	| ReadonlyArray<BaseExpand<T>>;

/**
 * This can interact poorly with generics because `field: 'desc'` would be treated as `field: string` which doesn't match
 */
type OrderByDirection = 'asc' | 'desc';

export type OrderBy<T extends Resource['Read'] = AnyResourceObject> =
	| StringKeyOf<T>
	| ReadonlyArray<OrderBy<T>>
	| { [k in StringKeyOf<T>]?: OrderByDirection }
	| ({
			[k in ExpandableStringKeyOf<T> & ResourceName]?: {
				$count: ODataCountOptions<ExtractExpand<T, k>>;
			};
	  } & {
			$dir: OrderByDirection;
	  });

type StringPrimitiveToType<
	T extends 'null' | 'string' | 'number' | 'boolean' | 'Date',
> =
	| ('null' extends T ? null : never)
	| ('number' extends T ? number : never)
	| ('string' extends T ? string : never)
	| ('boolean' extends T ? boolean : never)
	| ('Date' extends T ? Date : never);
type StringDictionaryToDictType<
	T extends Dictionary<
		Array<'null' | 'string' | 'number' | 'boolean' | 'Date'>
	>,
> = keyof T extends never
	? Record<string, never>
	: {
			[key in keyof T]: StringPrimitiveToType<T[key][number]>;
		};

export type Primitive = null | string | number | boolean | Date;
export type ParameterAlias = Primitive;

export interface ODataOptionsWithoutCount<
	T extends Resource['Read'] = AnyResourceObject,
> {
	$filter?: Filter<T>;
	$expand?: Expand<T>;
	$orderby?: OrderBy<T>;
	$top?: number;
	$skip?: number;
	$select?: StringKeyOf<T> | ReadonlyArray<StringKeyOf<T>>;
	$format?: string;
	[index: string]:
		| undefined
		| ParameterAlias
		| string[]
		| Filter<T>
		| Expand<T>
		| OrderBy<T>;
}
export type ODataCountOptions<T extends Resource['Read'] = AnyResourceObject> =
	Pick<ODataOptionsWithoutCount<T>, '$filter'>;
export interface ODataOptions<T extends Resource['Read'] = AnyResourceObject>
	extends ODataOptionsWithoutCount<NoInfer<T>> {
	$count?: ODataCountOptions<NoInfer<T>>;
	[index: string]:
		| ODataOptionsWithoutCount<NoInfer<T>>[string]
		| ODataCountOptions<NoInfer<T>>;
}
export type OptionsObject<T extends Resource['Read'] = AnyResourceObject> =
	ODataOptions<T>;

export type ODataMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type BaseResourceId =
	| string
	| number
	| Date
	| {
			'@': string;
	  };
type ResourceAlternateKey<T extends Resource['Read']> = {
	[key in StringKeyOf<T>]?: BaseResourceId;
};
type ResourceId<T extends Resource['Read']> =
	| BaseResourceId
	| ResourceAlternateKey<T>;

export type AnyObject = Dictionary<any>;

export interface Params<T extends Resource = AnyResource> {
	apiPrefix?: string;
	method?: ODataMethod;
	resource?: string;
	id?: ResourceId<T['Read']>;
	url?: string;
	body?: Partial<T['Write']>;
	passthrough?: AnyObject;
	passthroughByMethod?: { [method in ODataMethod]?: AnyObject };
	options?: ODataOptions<T['Read']>;
	retry?: RetryParameters;
}

export type ConstructorParams = Pick<Params, (typeof validParams)[number]>;

export interface SubscribeParams<T extends Resource = AnyResource>
	extends Params<T> {
	method?: 'GET';
	pollInterval?: number;
}

export interface GetOrCreateParams<T extends Resource = AnyResource>
	extends Omit<Params<T>, 'method' | 'url'> {
	id: ResourceAlternateKey<T['Read']>;
	resource: string;
	body: Partial<T['Write']>;
}

export interface UpsertParams<T extends Resource = AnyResource>
	extends Omit<Params<T>, 'id' | 'method' | 'url'> {
	id: { [key in StringKeyOf<T['Write']>]?: Primitive };
	resource: string;
	body: Partial<T['Write']>;
}
