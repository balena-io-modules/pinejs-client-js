import type Model from './example-model';
import { PinejsClient } from './test';
import { expectType, printType } from 'tsd';

const api = new PinejsClient<Model>('/resin');

it('should match get overload for $count', async () => {
	const fnCall = await api.get({
		resource: 'device',
		options: {
			$count: {
				$filter: {
					is_web_accessible: true,
				},
			},
		},
	});
	expectType<number>(fnCall);
});

it('should match get overload for single $select with an id', async () => {
	const fnCall = await api.get({
		resource: 'device',
		id: 123,
		options: {
			$select: 'id',
		},
	});
	expectType<{ id: number } | undefined>(fnCall);
});

it('should match get overload for multiple $select with an id', async () => {
	const fnCall = await api.get({
		resource: 'device',
		id: 123,
		options: {
			$select: ['id', 'uuid', 'actor'],
		},
	});

	expectType<
		| {
				id: number;
				uuid: string;
				actor: { __id: number };
		  }
		| undefined
	>(fnCall);
});

it('should expand properties from query', async () => {
	const fnCall = await api.get({
		resource: 'device',
		options: {
			$select: 'id',
			$expand: {
				actor: {
					$filter: {
						id: {
							$eq: 1,
						},
					},
				},
			},
		},
	});

	const a = fnCall[0].actor[0];

	printType(typeof a);
});
