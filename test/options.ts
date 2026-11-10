import type { ODataOptions, Params } from '..';
import { test } from './test';

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer U]
	? U
	: [];

const testId = (
	input: NonNullable<Params['id']>,
	output: string | Error,
	$it: Mocha.TestFunction = it,
) => {
	const resource = 'test';
	if (!(output instanceof Error)) {
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
	if (!(output instanceof Error)) {
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
	if (!(args[1] instanceof Error) && Array.isArray(args[0])) {
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
testId({}, new Error('If the id property is an object it must not be empty'));

testOrderBy('a', 'a');

testOrderBy(['a', 'b'], 'a,b');

testOrderBy({ a: 'desc' }, 'a desc');

testOrderBy([{ a: 'desc' }, { b: 'asc' }], 'a desc,b asc');

// @ts-expect-error Testing intentionally invalid type
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

testOrderBy({ 'a/b': 'asc' }, 'a/b asc');

testOrderBy({ 'a/$count': 'asc' }, 'a/$count asc');

for (const key of ['a,b', 'a/b c', 'a//b', '1', '$count', '$count/a']) {
	testOrderBy(
		{ [key]: 'asc' as const },
		new Error(
			`Orderby property names must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: ${JSON.stringify(key)}`,
		),
	);
}

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

// The typings only allow property names, but odata-parser also accepts `*` on its own
testSelect('*' as 'a', '*');

testSelect(['a/b', 'c'], 'a/b,c');

const invalidSelectNameError = (name: unknown) =>
	new Error(
		`Select property names must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: ${JSON.stringify(name)}`,
	);
for (const name of [
	'b&$filter=c eq 1',
	'a,b',
	'a b',
	'a//b',
	'$count',
] as string[] as Array<'a'>) {
	testSelect(['a', name], invalidSelectNameError(name));
	testSelect(new Set(['a', name]), invalidSelectNameError(name));
}
testSelect('a,b', invalidSelectNameError('a,b'));
// @ts-expect-error Testing intentionally invalid type
testSelect(['*', 'a'], invalidSelectNameError('*'));
// @ts-expect-error Testing intentionally invalid type
testSelect([1], invalidSelectNameError(1));

testCustom('a', 'a');

testCustom(1, '1');

testCustom(true, 'true');

testParam('test', "'test'");

testParam(1, '1');

testParam(
	{},
	new Error("Unknown type for parameter alias option '@param': object"),
);

describe('Invalid Dates', () => {
	const error = new Error('Not a valid value: Invalid Date');
	it('should be rejected as a parameter alias value', () => {
		test(error, { resource: 'test', options: { '@param': new Date(NaN) } });
	});
});

it('should throw an error when combining $count with other options', () => {
	test(
		new Error(
			`When using 'options: { $count: ... }' you can only specify $count, got: '["$count","$top"]'`,
		),
		{
			resource: 'test',
			options: { $count: {}, $top: 1 },
		},
	);
});

describe('parameter alias names', () => {
	it('should allow names that do not need encoding', () => {
		test("test(a=@a-b.c_d~e)?$filter=b eq @a-b.c_d~e&@a-b.c_d~e='x'", {
			resource: 'test',
			id: { a: { '@': 'a-b.c_d~e' } },
			options: {
				$filter: { b: { '@': 'a-b.c_d~e' } },
				'@a-b.c_d~e': 'x',
			},
		});
	});

	const invalidNameError = (name: string) =>
		new Error(
			`Parameter alias names must be non-empty and only contain [A-Za-z0-9-._~], got: ${JSON.stringify(name)}`,
		);

	it('should reject names with reserved characters in the options', () => {
		test(invalidNameError('a&b'), {
			resource: 'test',
			options: { '@a&b': 'x' },
		});
	});

	it('should reject names that need encoding in the options', () => {
		test(invalidNameError('é'), {
			resource: 'test',
			options: { '@é': 'x' },
		});
	});

	it('should reject names with spaces in references', () => {
		test(invalidNameError('a b'), {
			resource: 'test',
			options: { $filter: { b: { '@': 'a b' } } },
		});
	});

	it('should reject names that need encoding in references', () => {
		test(invalidNameError('é'), {
			resource: 'test',
			options: { $filter: { b: { '@': 'é' } } },
		});
	});

	it("should reject names with a ' in references", () => {
		test(invalidNameError("a'b"), {
			resource: 'test',
			options: { $filter: { b: { '@': "a'b" } } },
		});
	});

	it('should reject empty names in ids', () => {
		test(invalidNameError(''), {
			resource: 'test',
			id: { a: { '@': '' } },
		});
	});

	it('should reject names that need encoding in natural key ids', () => {
		test(invalidNameError('é'), {
			resource: 'test',
			id: { a: { '@': 'é' } },
		});
	});

	it('should reject names that need encoding in ids', () => {
		test(invalidNameError('a|b'), {
			resource: 'test',
			id: { '@': 'a|b' },
		});
	});
});

describe('id property names', () => {
	it('should allow numbers, strings and parameter aliases', () => {
		test("test(a=1,b='x',c=@p)?@p=1", {
			resource: 'test',
			id: { a: 1, b: 'x', c: { '@': 'p' } },
			options: { '@p': 1 },
		});
	});
	const invalidNameError = (name: string) =>
		new Error(
			`Property names in an id must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: ${JSON.stringify(name)}`,
		);
	for (const name of ['x=1)?$expand=owner#', 'é', '1', "a'"]) {
		it(`should reject ${JSON.stringify(name)}`, () => {
			test(invalidNameError(name), {
				resource: 'test',
				id: { slug: 's', [name]: 'z' },
			});
		});
	}
});

describe('id values', () => {
	for (const [description, value] of [
		['null', null],
		['boolean', true],
		['Date', new Date(0)],
	] as const) {
		it(`should reject ${description} values in an object id`, () => {
			test(
				new Error(
					`The id property 'a' must be a number, string or parameter alias, got: ${description}`,
				),
				{ resource: 'test', id: { a: value } },
			);
		});
	}
	for (const [description, value] of [
		['boolean', true],
		['Date', new Date(0)],
	] as const) {
		it(`should reject ${description} ids`, () => {
			test(
				new Error(
					`The id must be a number, string or parameter alias, got: ${description}`,
				),
				{ resource: 'test', id: value },
			);
		});
	}
	it('should allow a parameter alias without a prototype in an object id', () => {
		test('test(a=@p)?@p=1', {
			resource: 'test',
			id: { a: Object.assign(Object.create(null), { '@': 'p' }) },
			options: { '@p': 1 },
		});
	});
	for (const [description, value, type] of [
		['with other properties', { '@': 'p', b: 1 }, 'object'],
		['that is inherited', Object.create({ '@': 'p' }), 'object'],
		[
			'that is not enumerable next to other properties',
			Object.defineProperty({ b: 1 }, '@', { value: 'p' }),
			'object',
		],
		['on a Date', Object.assign(new Date(0), { '@': 'p' }), 'Date'],
	] as const) {
		it(`should reject a parameter alias ${description} in an object id`, () => {
			test(
				new Error(
					`The id property 'a' must be a number, string or parameter alias, got: ${type}`,
				),
				{ resource: 'test', id: { a: value }, options: { '@p': 1 } },
			);
		});
	}
	it('should reject a parameter alias with other properties as the id', () => {
		test(
			new Error(
				`Property names in an id must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: "@"`,
			),
			{ resource: 'test', id: { '@': 'p', b: 1 } as any, options: { '@p': 1 } },
		);
	});
});
