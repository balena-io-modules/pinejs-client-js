// import { expect } from 'chai';
import { test } from './test';

test('a(1)/act', {
	resource: 'a',
	id: 1,
	action: 'act',
});

test('a/act', {
	resource: 'a',
	action: 'act',
});

test("a(b='c')/act", {
	resource: 'a',
	id: {
		b: 'c',
	},
	action: 'act',
});

it('should throw an error on undefined action', () => {
	test(new Error('If the action property is set it must be non-null'), {
		resource: 'a',
		action: undefined,
	});
});

it('should throw an error on null action', () => {
	test(new Error('If the action property is set it must be non-null'), {
		resource: 'a',
		action: null,
	});
});

for (const action of ['act?$filter=a eq 1', 'a/b', '1']) {
	it(`should throw an error on the action ${JSON.stringify(action)}`, () => {
		test(
			new Error(
				`Action names must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: ${JSON.stringify(action)}`,
			),
			{ resource: 'a', action },
		);
	});
}
