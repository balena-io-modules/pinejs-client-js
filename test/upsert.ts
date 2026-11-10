import { expect } from 'chai';
import { PinejsClientCore, StatusError } from '..';

class PinejsClient extends PinejsClientCore {
	public requests: Array<{ method: string; url: string; body?: any }> = [];
	constructor(private postError: Error) {
		super('/');
	}
	public _request({
		method,
		url,
		body,
	}: Parameters<PinejsClientCore['_request']>[0]): Promise<any> {
		this.requests.push({ method, url, body });
		if (method === 'POST') {
			return Promise.reject(this.postError);
		}
		return Promise.resolve(undefined);
	}
}

describe('upsert', () => {
	it('should patch when the post fails with a unique key violation in the error message', async () => {
		const client = new PinejsClient(
			new StatusError('Unique key constraint violated', 409),
		);
		await client.upsert({ resource: 'a', id: { b: 'x' }, body: { c: 1 } });
		expect(client.requests).to.deep.equal([
			{ method: 'POST', url: '/a', body: { c: 1, b: 'x' } },
			{ method: 'PATCH', url: "/a?$filter=b eq 'x'", body: { c: 1 } },
		]);
	});

	it('should patch when the post fails with a unique key violation in the error body', async () => {
		const err = Object.assign(new StatusError('Request error', 409), {
			body: 'Unique key constraint violated',
		});
		const client = new PinejsClient(err);
		await client.upsert({ resource: 'a', id: { b: 'x' }, body: { c: 1 } });
		expect(client.requests.map(({ method }) => method)).to.deep.equal([
			'POST',
			'PATCH',
		]);
	});

	it('should rethrow other conflicts', async () => {
		const err = new StatusError('Some other conflict', 409);
		const client = new PinejsClient(err);
		try {
			await client.upsert({ resource: 'a', id: { b: 'x' }, body: { c: 1 } });
			expect.fail('Expected upsert to throw');
		} catch (e) {
			expect(e).to.equal(err);
		}
		expect(client.requests.map(({ method }) => method)).to.deep.equal(['POST']);
	});

	it('should reject a body that conflicts with the natural key', async () => {
		const client = new PinejsClient(
			new StatusError('Unique key constraint violated', 409),
		);
		try {
			await client.upsert({
				resource: 'a',
				id: { slug: 'from-id' },
				body: { slug: 'from-body', name: 'b' },
			});
			expect.fail('Expected upsert to throw');
		} catch (e: any) {
			expect(e.message).to.equal(
				"The body property 'slug' conflicts with the natural key in the id property",
			);
		}
		expect(client.requests).to.deep.equal([]);
	});

	it('should patch with a body that repeats the natural key', async () => {
		const client = new PinejsClient(
			new StatusError('Unique key constraint violated', 409),
		);
		await client.upsert({
			resource: 'a',
			id: { slug: 'c', created_at: new Date(0) },
			body: { slug: 'c', created_at: new Date(0), name: 'b' },
		});
		const body = { slug: 'c', created_at: new Date(0), name: 'b' };
		expect(
			client.requests.map(({ method, body: b }) => ({ method, body: b })),
		).to.deep.equal([
			{ method: 'POST', body },
			{ method: 'PATCH', body },
		]);
	});

	it('should reject an array id', async () => {
		const client = new PinejsClient(new Error('Unexpected request'));
		let error: unknown;
		try {
			await client.upsert({
				resource: 'a',
				// @ts-expect-error - an array is not a natural key
				id: ['x'],
				body: { c: 1 },
			});
		} catch (err) {
			error = err;
		}
		expect(error).to.be.instanceOf(Error);
		expect((error as Error).message).to.equal(
			'The id property must be an object',
		);
		expect(client.requests).to.deep.equal([]);
	});
});
