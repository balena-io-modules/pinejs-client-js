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
