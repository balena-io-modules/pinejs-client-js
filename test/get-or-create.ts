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
});
