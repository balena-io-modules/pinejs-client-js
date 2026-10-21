import { test } from './test';

it('should throw an unrecognised operator error', () => {
	test(new Error("Unrecognised operator: '$foobar'"), {
		resource: 'test',
		options: {
			$filter: {
				$foobar: 'fails',
			},
		},
	});
});

it('should throw an error on null id', () => {
	test(new Error('If the id property is set it must be non-null'), {
		resource: 'test',
		id: null,
	});
});

it('should throw an error on undefined id', () => {
	test(new Error('If the id property is set it must be non-null'), {
		resource: 'test',
		id: undefined,
	});
});

it('should throw an error when combining id with $count', () => {
	test(
		new Error(
			'`options: { $count: ... }` cannot be combined with `id`, please use `options: { $count: { $filter: { id: ... } } }` instead.',
		),
		{
			resource: 'test',
			id: 1,
			options: { $count: {} },
		},
	);
});
