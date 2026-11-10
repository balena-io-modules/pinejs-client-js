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
			id: { slug: 'c', created_at: new Date(0) },
			body: { slug: 'c', created_at: new Date(0), name: 'b' },
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
				client.requests.map(({ method, url, body }) => ({ method, url, body })),
			).to.deep.equal([
				{ method: 'GET', url: "/a(uuid=@u)?@u='abc'", body: undefined },
				{
					method: 'POST',
					url: "/a?@u='abc'",
					body: { uuid: 'abc', name: 'x' },
				},
			]);
			expect(result).to.deep.equal({ uuid: 'abc', name: 'x' });
		});

		it('should create with the parameter alias value when the body omits it', async () => {
			const client = new PinejsClient('/');
			const result = await client.getOrCreate({
				resource: 'a',
				id: { uuid: { '@': 'u' }, created_at: new Date(0) },
				body: { name: 'x' },
				options: { '@u': 'abc' },
			});
			expect(client.requests.map(({ method }) => method)).to.deep.equal([
				'GET',
				'POST',
			]);
			expect(result).to.deep.equal({
				uuid: 'abc',
				created_at: new Date(0),
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
	});
});
