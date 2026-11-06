import { expect } from 'chai';
import { PinejsClientCore } from '..';

class PinejsClient extends PinejsClientCore {
	public requests: Array<Parameters<PinejsClientCore['_request']>[0]> = [];
	public _request(
		params: Parameters<PinejsClientCore['_request']>[0],
	): Promise<any> {
		this.requests.push(params);
		return Promise.resolve({ d: [] });
	}
}

describe('prepare', () => {
	it('should not mutate the params passed in', async () => {
		const client = new PinejsClient('/');
		const params = {
			resource: 'a',
			options: { $filter: { b: { '@': 'b' } } },
			body: { c: 1 },
			passthrough: { headers: { d: 'e' } },
		};
		const snapshot = JSON.stringify(params);
		const prepared = client.prepare(params, { b: ['number'] });
		await prepared({ b: 1 }, { c: 2 }, { headers: { d: 'f' } });
		expect(JSON.stringify(params)).to.equal(snapshot);
		// The same params must still be usable with the other helpers
		await client.get(params);
		expect(client.requests[1].url).to.equal('/a?$filter=b eq @b');
	});

	it('should not reuse the body or passthrough of a previous call', async () => {
		const client = new PinejsClient('/');
		const prepared = client.prepare(
			{
				resource: 'a',
				method: 'PATCH',
				options: { $filter: { b: { '@': 'b' } } },
			},
			{ b: ['number'] },
		);
		await prepared({ b: 1 }, { c: 1 }, { headers: { authorization: 'x' } });
		await prepared({ b: 2 });
		const { method, url, body, ...passthrough } = client.requests[1];
		expect({ method, url, body, passthrough }).to.deep.equal({
			method: 'PATCH',
			url: '/a?$filter=b eq @b&@b=2',
			body: undefined,
			passthrough: {},
		});
	});
});

describe('subscribe', () => {
	it('should not mutate the params passed in', async () => {
		const client = new PinejsClient('/');
		const params = { resource: 'a', pollInterval: 1000 };
		const poll = client.subscribe(params);
		await new Promise((resolve) => setTimeout(resolve, 0));
		poll.destroy();
		expect(params).to.deep.equal({ resource: 'a', pollInterval: 1000 });
	});
});
