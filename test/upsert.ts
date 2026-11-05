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
});
