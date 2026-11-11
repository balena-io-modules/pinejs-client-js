import { expect } from 'chai';
import { PinejsClientCore } from '..';

class PinejsClient extends PinejsClientCore {
	public requests: Array<Parameters<PinejsClientCore['_request']>[0]> = [];
	public _request(
		params: Parameters<PinejsClientCore['_request']>[0],
	): Promise<any> {
		this.requests.push(params);
		if (params.method === 'GET') {
			// Nothing exists yet, so `getOrCreate` has to create it
			return Promise.resolve({ d: [] });
		}
		return Promise.resolve(params.body);
	}
}

describe('getOrCreate', () => {
	it('should reject a body that conflicts with the natural key', async () => {
		const client = new PinejsClient('/');
		try {
			await client.getOrCreate({
				resource: 'a',
				id: { slug: 'from-id' },
				body: { slug: 'from-body', name: 'b' },
			});
		} catch (err: any) {
			expect(err.message).to.equal(
				"The body property 'slug' conflicts with the natural key in the id property",
			);
			expect(client.requests).to.deep.equal([]);
			return;
		}
		throw new Error('Expected getOrCreate to be rejected');
	});

	it('should allow a body that repeats the natural key', async () => {
		const client = new PinejsClient('/');
		const result = await client.getOrCreate({
			resource: 'a',
			id: { slug: 'c', created_at: { '@': 'd' } },
			body: { slug: 'c', created_at: new Date(0), name: 'b' },
			options: { '@d': new Date(0) },
		});
		expect(client.requests.map(({ method }) => method)).to.deep.equal([
			'GET',
			'POST',
		]);
		expect(result).to.deep.equal({
			slug: 'c',
			created_at: new Date(0),
			name: 'b',
		});
	});

	it('should create with a natural key property named __proto__', async () => {
		const client = new PinejsClient('/');
		await client.getOrCreate({
			resource: 'a',
			id: JSON.parse('{"__proto__":"x"}'),
			body: { name: 'b' },
		});
		const postBody = client.requests[1].body!;
		expect(Object.keys(postBody)).to.deep.equal(['__proto__', 'name']);
		expect(JSON.stringify(postBody)).to.equal('{"__proto__":"x","name":"b"}');
	});

	describe('with parameter aliases in the id', () => {
		it('should allow a body value that matches the parameter alias value', async () => {
			const client = new PinejsClient('/');
			const result = await client.getOrCreate({
				resource: 'a',
				id: { uuid: { '@': 'u' } },
				body: { uuid: 'abc', name: 'x' },
				options: { '@u': 'abc' },
			});
			expect(
				client.requests.map(({ method, body }) => ({ method, body })),
			).to.deep.equal([
				{ method: 'GET', body: undefined },
				{ method: 'POST', body: { uuid: 'abc', name: 'x' } },
			]);
			expect(client.requests[0].url).to.equal("/a(uuid=@u)?@u='abc'");
			expect(result).to.deep.equal({ uuid: 'abc', name: 'x' });
		});

		it('should create with the parameter alias value when the body omits it', async () => {
			const client = new PinejsClient('/');
			const result = await client.getOrCreate({
				resource: 'a',
				id: { uuid: { '@': 'u' }, slug: 'c' },
				body: { name: 'x' },
				options: { '@u': 'abc' },
			});
			expect(client.requests.map(({ method }) => method)).to.deep.equal([
				'GET',
				'POST',
			]);
			expect(result).to.deep.equal({
				uuid: 'abc',
				slug: 'c',
				name: 'x',
			});
		});

		it('should reject a body value that conflicts with the parameter alias value', async () => {
			const client = new PinejsClient('/');
			try {
				await client.getOrCreate({
					resource: 'a',
					id: { uuid: { '@': 'u' } },
					body: { uuid: 'def', name: 'x' },
					options: { '@u': 'abc' },
				});
			} catch (err: any) {
				expect(err.message).to.equal(
					"The body property 'uuid' conflicts with the natural key in the id property",
				);
				expect(client.requests).to.deep.equal([]);
				return;
			}
			throw new Error('Expected getOrCreate to be rejected');
		});

		it('should reject a parameter alias that is missing from the options', async () => {
			const client = new PinejsClient('/');
			try {
				await client.getOrCreate({
					resource: 'a',
					id: { uuid: { '@': 'u' } },
					body: { uuid: 'abc', name: 'x' },
				});
			} catch (err: any) {
				expect(err.message).to.equal(
					"The parameter alias '@u' for the id property 'uuid' must be set in the options",
				);
				expect(client.requests).to.deep.equal([]);
				return;
			}
			throw new Error('Expected getOrCreate to be rejected');
		});

		it('should reject a parameter alias for the whole id', async () => {
			const client = new PinejsClient('/');
			try {
				await client.getOrCreate({
					resource: 'a',
					id: { '@': 'u' },
					body: { name: 'x' },
					options: { '@u': 'abc' },
				});
			} catch (err: any) {
				expect(err.message).to.equal(
					'The id property must be an object with the natural key of the model',
				);
				expect(client.requests).to.deep.equal([]);
				return;
			}
			throw new Error('Expected getOrCreate to be rejected');
		});

		it('should resolve a Date parameter alias alongside other natural key properties', async () => {
			const client = new PinejsClient('/');
			const result = await client.getOrCreate({
				resource: 'a',
				id: { slug: 's', created_at: { '@': 'c' } },
				body: { created_at: new Date(0), name: 'x' },
				options: { '@c': new Date(0) },
			});
			expect(client.requests[0].url).to.equal(
				"/a(slug='s',created_at=@c)?@c=datetime'1970-01-01T00:00:00.000Z'",
			);
			expect(result).to.deep.equal({
				slug: 's',
				created_at: new Date(0),
				name: 'x',
			});
		});
	});

	describe('should reject before making any requests', () => {
		const cases: Array<{
			title: string;
			params: Pick<
				Parameters<PinejsClient['getOrCreate']>[0],
				'id' | 'body' | 'options'
			>;
			message: string;
		}> = [
			{
				title: 'a parameter alias reference that is not a string',
				params: {
					id: { uuid: { '@': 1 as any } },
					body: { name: 'x' },
					options: { '@1': 'abc' },
				},
				message: 'Parameter alias reference must be a string, got: number',
			},
			{
				title: 'a parameter alias option that is not enumerable',
				params: {
					id: { uuid: { '@': 'u' } },
					body: { name: 'x' },
					options: Object.defineProperty({}, '@u', { value: 'abc' }),
				},
				message:
					"The parameter alias '@u' for the id property 'uuid' must be set in the options",
			},
			{
				title: 'a parameter alias value that is not a valid value',
				params: {
					id: { n: { '@': 'n' } },
					body: { n: NaN, name: 'x' },
					options: { '@n': NaN },
				},
				message:
					"Parameter alias option '@n' must be a finite number, got: NaN",
			},
			{
				title: 'a parameter alias value that is an Invalid Date',
				params: {
					id: { d: { '@': 'd' } },
					body: { name: 'x' },
					options: { '@d': new Date(NaN) },
				},
				message: "Parameter alias option '@d' is an Invalid Date",
			},
			{
				title: 'a parameter alias value that is an object',
				params: {
					id: { o: { '@': 'o' } },
					body: { o: { x: 1 }, name: 'x' },
					options: { '@o': { x: 1 } },
				},
				message: "Unknown type for parameter alias option '@o': object",
			},
			{
				title: 'an id value that is an object',
				params: {
					id: { app: { __id: 1 } as any },
					body: { app: { __id: 1 }, name: 'x' },
				},
				message: "Unknown type for the id property 'app': object",
			},
			{
				title: 'a parameter alias with other properties',
				params: {
					id: { uuid: { '@': 'u', e: 1 } as any },
					body: { name: 'x' },
					options: { '@u': 'abc' },
				},
				message: "Unknown type for the id property 'uuid': object",
			},
			{
				title:
					'a parameter alias that is not enumerable next to other properties',
				params: {
					id: {
						uuid: Object.defineProperty({ e: 1 }, '@', { value: 'u' }) as any,
					},
					body: { name: 'x' },
					options: { '@u': 'abc' },
				},
				message: "Unknown type for the id property 'uuid': object",
			},
			{
				title: 'a parameter alias that is inherited',
				params: {
					id: { uuid: Object.create({ '@': 'u' }) },
					body: { name: 'x' },
					options: { '@u': 'abc' },
				},
				message: "Unknown type for the id property 'uuid': object",
			},
			{
				title: 'an id value that is NaN',
				params: {
					id: { n: NaN },
					body: { n: NaN, name: 'x' },
				},
				message: "The id property 'n' must be a finite number, got: NaN",
			},
			{
				title: 'an id value that is Infinity',
				params: {
					id: { n: Infinity },
					body: { name: 'x' },
				},
				message: "The id property 'n' must be a finite number, got: Infinity",
			},
			{
				title: 'an id value that is an Invalid Date',
				params: {
					id: { d: new Date(NaN) },
					body: { d: new Date(NaN), name: 'x' },
				},
				message: "The id property 'd' is an Invalid Date",
			},
			{
				title: 'an id value with a lone surrogate',
				params: {
					id: { s: '\uD800' },
					body: { s: '\uD800', name: 'x' },
				},
				message: "The id property 's' must not contain lone surrogates",
			},
			{
				title: 'an undefined body value for a natural key property',
				params: {
					id: { slug: 's' },
					body: { slug: undefined, name: 'x' },
				},
				message:
					"The body property 'slug' is undefined, omit it to use the value from the id property",
			},
		];
		for (const { title, params, message } of cases) {
			it(title, async () => {
				const client = new PinejsClient('/');
				let error: unknown;
				try {
					await client.getOrCreate({ resource: 'a', ...params });
				} catch (err) {
					error = err;
				}
				expect(error).to.be.instanceOf(Error);
				expect((error as Error).message).to.equal(message);
				expect(client.requests).to.deep.equal([]);
			});
		}
	});
});
