import type { Expand } from '..';
import { test } from './test';
import * as _ from 'lodash';

function testExpand(input: Expand, output: string | Error): void;
function testExpand(input: any, output: Error): void;
function testExpand(input: Expand, output: string | Error): void {
	const resource = 'test';
	if (!_.isError(output)) {
		output = `${resource}?$expand=${output}`;
	}
	it(`should compile ${JSON.stringify(input)} to ${output}`, () => {
		test(output, {
			resource,
			options: {
				$expand: input,
			},
		});
	});
}

// String
testExpand('a', 'a');

// String array
testExpand(['a'], 'a');

testExpand(['a', 'b'], 'a,b');

// String object
testExpand(
	{
		a: 'b',
	},
	new Error(
		`'$expand: a: "b"' is invalid, use '$expand: a: $expand: "b"' instead.`,
	),
);

testExpand(
	{
		a: 'b',
		c: 'd',
	},
	new Error(
		`'$expand: a: "b"' is invalid, use '$expand: a: $expand: "b"' instead.`,
	),
);

// Object array
testExpand(
	[
		{
			a: 'b',
		},
	],
	new Error(
		`'$expand: a: "b"' is invalid, use '$expand: a: $expand: "b"' instead.`,
	),
);

testExpand(
	[
		{
			a: 'b',
		},
		{
			c: 'd',
		},
	],
	new Error(
		`'$expand: a: "b"' is invalid, use '$expand: a: $expand: "b"' instead.`,
	),
);

// Array in object
testExpand(
	{
		a: ['b', 'c'],
	},
	new Error(`'$expand: a: [...]' is invalid, use '$expand: a: {...}' instead.`),
);

testExpand(
	{
		a: [
			{
				b: 'c',
			},
			{
				d: 'e',
			},
		],
	},
	new Error(`'$expand: a: [...]' is invalid, use '$expand: a: {...}' instead.`),
);

// Object in object
testExpand(
	{
		a: {
			b: 'c',
			d: 'e',
		},
	},
	new Error(
		`'$expand: a: b: ...' is invalid, use '$expand: a: $expand: b: ...' instead.`,
	),
);

// Expand options
testExpand(
	{
		a: {},
	},
	'a',
);

testExpand(
	{
		a: { $filter: { b: 'c' } },
	},
	"a($filter=b eq 'c')",
);

testExpand(
	{
		a: {
			$select: ['b', 'c'],
		},
	},
	'a($select=b,c)',
);

testExpand(
	{
		a: {
			$filter: { b: 'c' },
			$select: ['d', 'e'],
		},
	},
	"a($filter=b eq 'c';$select=d,e)",
);

testExpand(
	{
		a: {
			b: 'c',
			$filter: { d: 'e' },
			$select: ['f', 'g'],
		},
	},
	new Error(
		`'$expand: a: b: ...' is invalid, use '$expand: a: $expand: b: ...' instead.`,
	),
);

testExpand(
	{
		a: [{ $filter: { b: 'c' } }, { $filter: { d: 'e' }, $select: ['f', 'g'] }],
	},
	new Error(`'$expand: a: [...]' is invalid, use '$expand: a: {...}' instead.`),
);

testExpand(
	{
		a: {
			$expand: 'b',
		},
	},
	'a($expand=b)',
);

testExpand(
	{
		a: {
			$expand: {
				b: {
					$expand: 'c',
				},
			},
		},
	},
	'a($expand=b($expand=c))',
);

testExpand(
	{
		a: {
			$expand: {
				b: {
					$expand: 'c',
					$select: ['d', 'e'],
				},
			},
		},
	},
	'a($expand=b($expand=c;$select=d,e))',
);

testExpand(
	{
		'a/$count': { $filter: { b: 'c' } },
	},
	"a/$count($filter=b eq 'c')",
);

testExpand(
	{
		a: { $count: { $filter: { b: 'c' } } },
	},
	"a/$count($filter=b eq 'c')",
);

// TODO: Replace the expected result with the commented error in the next major
// since anything other $filter inside a $count doesn't make sense.
testExpand(
	{
		a: {
			$count: {
				// @ts-expect-error This isn't valid but is silently dropped for backwards compatibility
				$select: 'a',
				$filter: { b: 'c' },
			},
		},
	} satisfies Expand as Expand,
	"a/$count($select=a;$filter=b eq 'c')",
	// new Error(`'When using '$expand: a: $count: ...' you can only specify $filter in the $count, got: '["$select","$filter"]'''`)
);

testExpand(
	{
		a: { $expand: 'b/$count' },
	},
	'a($expand=b/$count)',
);

testExpand(
	{
		a: { $expand: { b: { $count: {} } } },
	},
	'a($expand=b/$count)',
);

testExpand(
	{
		a: { $expand: ['b/$count', 'c'] },
	},
	'a($expand=b/$count,c)',
);

testExpand(
	{
		a: { $expand: [{ b: { $count: {} } }, 'c'] },
	},
	'a($expand=b/$count,c)',
);

testExpand(
	{
		a: {
			$expand: {
				b: {
					$expand: 'c/$count',
					$filter: { d: 'e' },
				},
			},
		},
	},
	"a($expand=b($expand=c/$count;$filter=d eq 'e'))",
);

testExpand(
	{
		a: {
			$expand: {
				b: {
					$expand: { c: { $count: {} } },
					$filter: { d: 'e' },
				},
			},
		},
	},
	"a($expand=b($expand=c/$count;$filter=d eq 'e'))",
);
