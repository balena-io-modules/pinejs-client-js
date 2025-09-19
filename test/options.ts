import type { ODataOptions, Params } from '..';
import { test } from './test';
import * as _ from 'lodash';

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer U]
	? U
	: [];

const testId = (
	input: NonNullable<Params['id']>,
	output: string | Error,
	$it: Mocha.TestFunction = it,
) => {
	const resource = 'test';
	if (!_.isError(output)) {
		output = `${resource}(${output})`;
	}
	$it(`should compile ${JSON.stringify(input)} to ${output}`, () => {
		test(output, {
			resource,
			id: input,
		});
	});
};

const testOption = <T extends keyof ODataOptions>(
	option: T,
	input: ODataOptions[T],
	output: string | Error,
	$it: Mocha.TestFunction = it,
) => {
	const resource = 'test';
	if (!_.isError(output)) {
		output = `${resource}?${option}=${output}`;
	}
	$it(
		`should compile ${input instanceof Set ? `Set(${JSON.stringify(Array.from(input))})` : JSON.stringify(input)} to ${output}`,
		() => {
			test(output, {
				resource,
				options: {
					[option]: input,
				},
			});
		},
	);
};

const testOrderBy = (
	...args: Tail<Parameters<typeof testOption<'$orderby'>>>
) => {
	testOption('$orderby', ...args);
};
const testTop = (...args: Tail<Parameters<typeof testOption<'$top'>>>) => {
	testOption('$top', ...args);
};
const testSkip = (...args: Tail<Parameters<typeof testOption<'$skip'>>>) => {
	testOption('$skip', ...args);
};
const testFormat = (
	...args: Tail<Parameters<typeof testOption<'$format'>>>
) => {
	testOption('$format', ...args);
};
const testSelect = (
	...args: Tail<Parameters<typeof testOption<'$select'>>>
) => {
	if (!_.isError(args[1]) && Array.isArray(args[0])) {
		// Automatically do an equivalent test for `Set`s, unless we're expecting an error as the message will be different
		testOption(
			'$select',
			new Set(args[0]),
			...(args.slice(1) as Tail<typeof args>),
		);
	}
	testOption('$select', ...args);
};
const testCustom = (...args: Tail<Parameters<typeof testOption<'custom'>>>) => {
	testOption('custom', ...args);
};
const testParam = (...args: Tail<Parameters<typeof testOption<'@param'>>>) => {
	testOption('@param', ...args);
};

testId(1, '1');
testId('Bob', "'Bob'");
testId({ '@': 'param' }, '@param');
testId(
	{
		a: 1,
		b: 2,
	},
	'a=1,b=2',
);
testId(
	{
		a: 'Bob',
		b: 'Smith',
	},
	"a='Bob',b='Smith'",
);
testId(
	{
		a: { '@': 'param1' },
		b: { '@': 'param2' },
	},
	'a=@param1,b=@param2',
);

testOrderBy('a', 'a');

testOrderBy(['a', 'b'], 'a,b');

testOrderBy({ a: 'desc' }, 'a desc');

testOrderBy([{ a: 'desc' }, { b: 'asc' }], 'a desc,b asc');

testOrderBy([['a']], new Error("'$orderby' cannot have nested arrays"));

testOrderBy(
	// @ts-expect-error Testing intentionally invalid type
	{ a: 'x' },
	new Error("'$orderby' direction must be 'asc' or 'desc'"),
);

testOrderBy(
	{ a: 'asc', b: 'desc' },
	new Error("'$orderby' objects must have exactly one element, got 2 elements"),
);

testOrderBy([], new Error("'$orderby' arrays have to have at least 1 element"));

testOrderBy(
	// @ts-expect-error Testing intentionally invalid type
	1,
	new Error("'$orderby' option has to be either a string, array, or object"),
);

testOrderBy({ a: { $count: {} }, $dir: 'desc' }, 'a/$count desc');

testOrderBy(
	{ a: { $count: { $filter: { d: 'e' } } }, $dir: 'desc' },
	"a/$count($filter=d eq 'e') desc",
);

testOrderBy(
	[
		{
			a: { $count: { $filter: { d: 'e' } } },
			$dir: 'desc',
		},
		{
			b: { $count: {} },
			$dir: 'desc',
		},
		{
			c: 'asc',
		},
	],
	"a/$count($filter=d eq 'e') desc,b/$count desc,c asc",
);

testOrderBy(
	// @ts-expect-error Testing intentionally invalid type
	{ a: { $count: {} } },
	new Error(
		`'$orderby' objects should either use the '{ a: 'asc' }' or the $orderby: { a: { $count: ... }, $dir: 'asc' } notation`,
	),
);

testOrderBy(
	// @ts-expect-error Testing intentionally invalid type
	{ a: { $filter: { d: 'e' } }, $dir: 'desc' },
	new Error(
		`When using '$orderby: { a: { $count: ... }, $dir: 'asc' }' you can only specify $count, got: '["$filter"]'`,
	),
);

testOrderBy(
	// @ts-expect-error Testing intentionally invalid type
	{ a: { $count: { $expand: 'e' } }, $dir: 'desc' },
	new Error(
		`When using '$orderby: { a: { $count: ... }, $dir: 'asc' }' you can only specify $filter in the $count, got: '["$expand"]`,
	),
);

testOrderBy(
	// @ts-expect-error Testing intentionally invalid type
	{ a: { $count: { $expand: 'e', $filter: { d: 'e' } } }, $dir: 'desc' },
	new Error(
		`When using '$orderby: { a: { $count: ... }, $dir: 'asc' }' you can only specify $filter in the $count, got: '["$expand","$filter"]`,
	),
);

testTop(1, '1');

// @ts-expect-error Testing intentionally invalid type
testTop('1', new Error("'$top' option has to be a number"));

testSkip(1, '1');

// @ts-expect-error Testing intentionally invalid type
testSkip('1', new Error("'$skip' option has to be a number"));

testFormat('json;metadata=full', 'json;metadata=full');

testFormat('json;metadata=none', 'json;metadata=none');

testSelect('a', 'a');

testSelect(['a', 'b'], 'a,b');

testSelect([], new Error(`'$select' arrays have to have at least 1 element`));

testSelect(
	new Set([]),
	new Error(`'$select' sets have to have at least 1 element`),
);

// @ts-expect-error Testing intentionally invalid type
testSelect(1, new Error("'$select' option has to be either a string or array"));

testCustom('a', 'a');

testCustom(1, '1');

testCustom(true, 'true');

testParam('test', "'test'");

testParam(1, '1');

testParam(
	{},
	new Error("Unknown type for parameter alias option '@param': object"),
);
