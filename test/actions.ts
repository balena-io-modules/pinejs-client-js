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
