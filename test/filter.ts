import type { Filter, FilterObj } from '..';
import { test } from './test';
import * as _ from 'lodash';

function testFilter(
	input: Filter,
	output: string | Error,
	$it?: Mocha.TestFunction,
): void;
function testFilter(input: any, output: Error, $it?: Mocha.TestFunction): void;
function testFilter(
	input: Filter,
	output: string | Error,
	$it: Mocha.TestFunction = it,
): void {
	let countOutput: string | Error;
	const resource = 'test';
	if (!_.isError(output)) {
		countOutput = resource + '/$count?$filter=' + output;
		output = resource + '?$filter=' + output;
	} else {
		countOutput = output;
	}
	$it(`should compile ${JSON.stringify(input)} to ${output}`, () => {
		test(output, {
			resource,
			options: {
				$filter: input,
			},
		});
	});
	$it(`should compile ${JSON.stringify(input)} to ${countOutput}`, () => {
		test(
			new Error(
				"`resource: 'a/$count'` has been removed, please use `options: { $count: { ... } }` instead.",
			),
			{
				resource: `${resource}/$count`,
				options: {
					$filter: input,
				},
			},
		);
	});
	$it(`should compile ${JSON.stringify(input)} to ${countOutput}`, () => {
		test(countOutput, {
			resource,
			options: {
				$count: {
					$filter: input,
				},
			},
		});
	});
}

testFilter(
	{
		a: 'b',
		d: 'e',
	},
	"(a eq 'b') and (d eq 'e')",
);

testFilter(
	{
		a: "b'c",
		d: "e''f'''g",
	},
	"(a eq 'b''c') and (d eq 'e''''f''''''g')",
);

const testOperator = function (operator: string) {
	const createFilter = (partialFilter: Filter) => ({
		[`$${operator}`]: partialFilter,
	});

	testFilter(
		createFilter({
			a: { '@': 'b' },
			c: { '@': 'd' },
		}),
		`(a eq @b) ${operator} (c eq @d)`,
	);

	testFilter(
		createFilter({
			a: 'b',
			c: 'd',
		}),
		`(a eq 'b') ${operator} (c eq 'd')`,
	);

	testFilter(
		createFilter([{ a: 'b' }, { c: 'd' }]),
		`(a eq 'b') ${operator} (c eq 'd')`,
	);

	testFilter({ a: createFilter('b') }, `a ${operator} 'b'`);

	testFilter(
		{
			a: createFilter(['b', 'c']),
		},
		`a eq ('b' ${operator} 'c')`,
	);

	testFilter(
		{
			a: createFilter({
				b: 'c',
				d: 'e',
			}),
		},
		`a eq ((b eq 'c') ${operator} (d eq 'e'))`,
	);

	testFilter(
		{
			a: createFilter({
				$: 'b',
			}),
		},
		`a ${operator} b`,
	);

	testFilter(
		{
			a: createFilter({
				$: ['b', 'c'],
			}),
		},
		`a ${operator} b/c`,
	);

	const rawDatetime = "datetime'2015-10-20T14%3A04%3A05.374Z'";
	testFilter(
		{
			a: createFilter({
				$raw: rawDatetime,
			}),
		},
		`a ${operator} (${rawDatetime})`,
	);

	testFilter(
		{
			// @ts-expect-error This is intentionally invalid to test a failure
			a: createFilter({
				$duration: 'P6D',
			}),
		},
		new Error(`Expected type for $duration, got: string`),
	);

	testFilter(
		{
			a: createFilter({
				$duration: {
					negative: true,
					days: 6,
					hours: 23,
					minutes: 59,
					seconds: 59.9999,
				},
			}),
		},
		`a ${operator} duration'-P6DT23H59M59.9999S'`,
	);

	testFilter(
		{
			a: createFilter({
				$duration: {
					days: 6,
				},
			}),
		},
		`a ${operator} duration'P6D'`,
	);

	testFilter(
		{
			a: createFilter({
				$duration: {
					hours: 23,
				},
			}),
		},
		`a ${operator} duration'PT23H'`,
	);

	testFilter(
		{
			a: createFilter({
				$duration: {
					minutes: 1,
				},
			}),
		},
		`a ${operator} duration'PT1M'`,
	);

	testFilter(
		{
			a: createFilter({
				$duration: {
					seconds: 10,
				},
			}),
		},
		`a ${operator} duration'PT10S'`,
	);

	testFilter(
		{
			a: createFilter({
				$sub: [
					{ $now: {} },
					{
						$duration: {
							days: 6,
							hours: 23,
							minutes: 59,
							seconds: 59.9999,
						},
					},
				],
			}),
		},
		`a ${operator} (now() sub duration'P6DT23H59M59.9999S')`,
	);

	testFilter(
		{
			a: createFilter({
				$or: [{ $: 'b' }, { $: 'c' }],
			}),
		},
		`a ${operator} (b or c)`,
	);
};

const testFunction = function (funcName: string) {
	const createFilter = function (partialFilter: Filter) {
		return {
			['$' + funcName]: partialFilter,
		};
	};

	testFilter(createFilter(null), `${funcName}()`);

	testFilter(
		createFilter({
			a: 'b',
			c: 'd',
		}),
		`${funcName}(a eq 'b',c eq 'd')`,
	);

	testFilter(
		createFilter([{ a: 'b' }, { c: 'd' }]),
		`${funcName}(a eq 'b',c eq 'd')`,
	);

	testFilter({ a: createFilter('b') }, `${funcName}(a,'b')`);

	testFilter(
		{
			a: createFilter(['b', 'c']),
		},
		`a eq ${funcName}('b','c')`,
	);

	testFilter(
		{
			a: createFilter({
				b: 'c',
				d: 'e',
			}),
		},
		`a eq ${funcName}(b eq 'c',d eq 'e')`,
	);
};

testOperator('ne');
testOperator('eq');
testOperator('gt');
testOperator('ge');
testOperator('lt');
testOperator('le');

// Test operands
testFilter({ a: 'b' }, "a eq 'b'");
testFilter({ a: 1 }, 'a eq 1');
testFilter({ a: true }, 'a eq true');
testFilter({ a: false }, 'a eq false');
testFilter({ a: null }, 'a eq null');
(function () {
	const date = new Date();
	testFilter({ a: date }, `a eq datetime'${date.toISOString()}'`);
})();

// Test mixing operators
testFilter(
	{
		$ne: [
			{
				$eq: {
					a: 'b',
					c: 'd',
				},
			},
			{ e: 'f' },
		],
	},
	"((a eq 'b') eq (c eq 'd')) ne (e eq 'f')",
);

testFilter(
	[
		{
			$eq: {
				a: 'b',
				c: 'd',
			},
		},
		{
			$ne: {
				e: 'f',
				g: 'h',
			},
		},
	],
	"((a eq 'b') eq (c eq 'd')) or ((e eq 'f') ne (g eq 'h'))",
);

testFilter(
	{
		$ne: [
			{
				$eq: [{ a: 'b' }, { d: 'e' }],
			},
			{ c: 'd' },
		],
	},
	"((a eq 'b') eq (d eq 'e')) ne (c eq 'd')",
);

testFilter(
	{
		a: {
			b: 'c',
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: 'c',
			d: 'e',
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: [{ b: 'c' }, { d: 'e' }],
	},
	"a eq ((b eq 'c') or (d eq 'e'))",
);

testFilter(
	{
		a: ['c', 'd'],
	},
	"a eq ('c' or 'd')",
);

testFilter(
	{
		a: {
			b: ['c', 'd'],
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: [{ b: 'c' }, 'd'],
	},
	"a eq ((b eq 'c') or 'd')",
);

testFilter(
	{
		a: {
			b: 'c',
			$eq: 'd',
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{ '@': true },
	new Error('Parameter alias reference must be a string, got: boolean'),
);

// Test raw strings
testFilter(
	{ $raw: "(a/b eq 'c' and a eq 'd')" },
	"((a/b eq 'c' and a eq 'd'))",
);

testFilter(
	{ $raw: true },
	new Error('Expected string/array/object for $raw, got: boolean'),
);

testFilter([{ $raw: 'a ge b' }, { $raw: 'a le c' }], '(a ge b) or (a le c)');

testFilter(
	{
		a: {
			b: [{ $raw: 'c ge d' }, { $raw: 'd le e' }],
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$and: [{ $raw: 'c ge d' }, { $raw: 'e le f' }],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

// Test raw arrays
testFilter(
	{
		$raw: ['a/b eq $1 and a eq $2', 'c', 'd'],
	},
	"(a/b eq ('c') and a eq ('d'))",
);

testFilter(
	{
		$raw: [true],
	},
	new Error('First element of array for $raw must be a string, got: boolean'),
);

testFilter(
	{
		$raw: [
			'a/b eq $1 and a eq $2',
			{ c: 'd' },
			{
				$add: [1, 2],
			},
		],
	},
	"(a/b eq (c eq 'd') and a eq (1 add 2))",
);

testFilter(
	{
		$raw: ['a/b eq $1', { $raw: '$$' }],
	},
	'(a/b eq (($$)))',
);

testFilter(
	{
		$raw: [
			'a/b eq $10 and a eq $1',
			...Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
		],
	},
	'(a/b eq (10) and a eq (1))',
);

// Test raw objects
testFilter(
	{
		$raw: {
			$string: 'a/b eq $1 and a eq $2',
			1: 'c',
			2: 'd',
		},
	},
	"(a/b eq ('c') and a eq ('d'))",
);

testFilter(
	{
		$raw: {
			$string: true,
		},
	},
	new Error(
		'$string element of object for $raw must be a string, got: boolean',
	),
);
testFilter(
	{
		$raw: {
			$string: '',
			$invalid: '',
		},
	},
	new Error('$raw param names must contain only [a-zA-Z0-9], got: $invalid'),
);

testFilter(
	{
		$raw: {
			$string: 'a/b eq $1 and a eq $2',
			1: { c: 'd' },
			2: { $add: [1, 2] },
		},
	},
	"(a/b eq (c eq 'd') and a eq (1 add 2))",
);

testFilter(
	{
		$raw: {
			$string: 'a/b eq $1',
			1: { $raw: '$$' },
		},
	},
	'(a/b eq (($$)))',
);

testFilter(
	{
		$raw: {
			$string: 'a/b eq $10 and a eq $1',
			1: 1,
			10: 10,
		},
	},
	'(a/b eq (10) and a eq (1))',
);

testFilter(
	{
		$raw: {
			$string: 'a eq $a and b eq $b or b eq $b2',
			a: 'a',
			b: 'b',
			b2: 'b2',
		},
	},
	"(a eq ('a') and b eq ('b') or b eq ('b2'))",
);

// Test $and
testFilter(
	{
		a: {
			b: {
				$and: ['c', 'd'],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$and: [{ c: 'd' }, { e: 'f' }],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

// Test $or
testFilter(
	{
		a: {
			b: {
				$or: ['c', 'd'],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$or: [{ c: 'd' }, { e: 'f' }],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

// Test $in
testFilter(
	{
		a: {
			b: {
				$in: ['c'],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$in: ['c', 'd'],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$in: [{ c: 'd' }, { e: 'f' }],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$in: {
					c: 'd',
				},
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$in: {
					c: 'd',
					e: 'f',
				},
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$in: 'c',
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

// Test $not
testFilter({ $not: 'a' }, "not('a')");

testFilter(
	{
		$not: {
			a: 'b',
		},
	},
	"not(a eq 'b')",
);

testFilter(
	{
		$not: {
			a: 'b',
			c: 'd',
		},
	},
	"not((a eq 'b') and (c eq 'd'))",
);

testFilter(
	{
		$not: [{ a: 'b' }, { c: 'd' }],
	},
	"not((a eq 'b') or (c eq 'd'))",
);

testFilter(
	{
		a: {
			$not: 'b',
		},
	},
	"a eq not('b')",
);

testFilter(
	{
		a: {
			$not: ['b', 'c'],
		},
	},
	"a eq not('b' or 'c')",
);

testFilter(
	{
		a: {
			$not: {
				b: 'c',
				d: 'e',
			},
		},
	},
	"a eq not((b eq 'c') and (d eq 'e'))",
);

testFilter(
	{
		a: {
			$not: [{ b: 'c' }, { d: 'e' }],
		},
	},
	"a eq not((b eq 'c') or (d eq 'e'))",
);

// Test $add
testOperator('add');

// Test $sub
testOperator('sub');

// Test $mul
testOperator('mul');

// Test $div
testOperator('div');

// Test $mod
testOperator('mod');

// Test $
testFilter(
	{
		a: {
			$: 'b',
		},
	},
	'a eq b',
);

testFilter(
	{
		a: {
			b: {
				$: 'c',
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

testFilter(
	{
		a: {
			b: {
				$: ['c', 'd'],
			},
		},
	},
	new Error(
		'`$filter: a: b: ...` has been removed, please use `$filter: a: $any: { $alias: "x", $expr: x: b: ... }` instead.',
	),
);

// test $count
testFilter(
	{
		$eq: [{ $: 'a/$count' }, 1],
	},
	'a/$count eq 1',
);

testFilter(
	{ a: { $count: 1 } },
	new Error(
		'`$filter: { a: { $count: { $op: number } } }` has been removed, please use `$filter: { $eq: [ { a: { $count: {} } }, number ] }` instead.',
	),
);

testFilter(
	{
		$eq: [{ $: ['a', '$count'] }, 1],
	},
	'a/$count eq 1',
);

testFilter(
	{
		$lt: [{ a: { $count: {} } }, 1],
	},
	'a/$count lt 1',
);

testFilter(
	{
		$lt: [{ a: { $count: { $filter: { b: 'c' } } } }, 1],
	} satisfies FilterObj,
	"a/$count($filter=b eq 'c') lt 1",
);

// Test functions
testFunction('contains');
testFunction('endswith');
testFunction('startswith');
testFunction('length');
testFunction('indexof');
testFunction('substring');
testFunction('tolower');
testFunction('toupper');
testFunction('trim');
testFunction('concat');
testFunction('year');
testFunction('month');
testFunction('day');
testFunction('hour');
testFunction('minute');
testFunction('second');
testFunction('fractionalseconds');
testFunction('date');
testFunction('time');
testFunction('totaloffsetminutes');
testFunction('now');
testFunction('maxdatetime');
testFunction('mindatetime');
testFunction('totalseconds');
testFunction('round');
testFunction('floor');
testFunction('ceiling');
testFunction('isof');
testFunction('cast');

// Test a one param function
testFilter(
	{
		$eq: [{ $tolower: { $: 'a' } }, { $tolower: 'b' }],
	},
	"tolower(a) eq tolower('b')",
);

const testLambda = function (operator: string) {
	const createFilter = (partialFilter: {
		$alias?: string;
		$expr?: Filter;
	}) => ({
		[operator]: partialFilter,
	});

	const op = operator.slice(1);

	testFilter(
		{
			a: createFilter({
				$alias: 'b',
				$expr: {
					b: { c: 'd' },
				},
			}),
		},
		`a/${op}(b:b/c eq 'd')`,
	);

	testFilter(
		{
			a: createFilter({
				$expr: {
					b: { c: 'd' },
				},
			}),
		},
		new Error(`Lambda expression (${operator}) has no alias defined.`),
	);

	testFilter(
		{
			a: createFilter({
				$alias: 'b',
			}),
		},
		new Error(`Lambda expression (${operator}) has no expr defined.`),
	);

	testFilter(
		{
			a: createFilter({
				$alias: 'al',
				$expr: { $eq: [{ al: { b: { $count: {} } } }, 1] },
			}),
		},
		`a/${op}(al:al/b/$count eq 1)`,
	);

	testFilter(
		{
			a: createFilter({
				$alias: 'al',
				$expr: { $eq: [{ al: { b: { $count: { $filter: { c: 'd' } } } } }, 1] },
			}),
		},
		`a/${op}(al:al/b/$count($filter=c eq 'd') eq 1)`,
	);

	testFilter(
		{
			a: createFilter({
				$alias: 'x',
				$expr: {
					// Filter on the default (aka non-ESR) balenaOS hostApp
					x: {
						b: createFilter({
							$alias: 'y',
							$expr: {
								y: {
									c: 'd',
								},
							},
						}),
						e: createFilter({
							$alias: 'z',
							$expr: {
								z: {
									f: 'g',
								},
							},
						}),
					},
				},
			}),
		},
		`a/${op}(x:(x/b/${op}(y:y/c eq 'd')) and (x/e/${op}(z:z/f eq 'g')))`,
	);
};

// Test $any
testLambda('$any');

// Test $all
testLambda('$all');

// Test $fn calls
testFilter(
	{
		a: {
			$fn: {
				$scope: 'E',
				$method: 'f',
			},
		},
	},
	'a/E.f()',
);

testFilter(
	{
		a: {
			$fn: {
				$scope: '$E',
				$method: '$f',
			},
		},
	},
	'a/%24E.%24f()',
);

testFilter(
	{
		a: {
			$fn: {
				$scope: 'E',
				$method: 'f',
				$args: [null, 'arg1'],
			},
		},
	},
	`a/E.f(null,'arg1')`,
);

testFilter(
	{
		$or: {
			o: {
				$fn: {
					$scope: 'E',
					$method: 'f',
				},
			},
			$and: {
				a: true,
				b: {
					$any: {
						$alias: 'c',
						$expr: {
							c: {
								d: {
									$fn: {
										$scope: 'E',
										$method: 'f',
									},
								},
							},
						},
					},
				},
			},
		},
	},
	'(o/E.f()) or ((a eq true) and (b/any(c:c/d/E.f())))',
);

testFilter(
	{
		$or: {
			o: {
				$fn: {
					$scope: 'E',
					$method: 'f',
				},
			},
			$and: {
				a: true,
				b: {
					$any: {
						$alias: 'c',
						$expr: {
							c: {
								d: {
									$fn: {
										$scope: 'B',
										$method: 'k',
										$args: ['arg1', 'arg2'],
									},
								},
							},
						},
					},
				},
			},
		},
	},
	`(o/E.f()) or ((a eq true) and (b/any(c:c/d/B.k('arg1','arg2'))))`,
);
