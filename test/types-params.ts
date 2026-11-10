import { expect } from 'chai';
import { PinejsClientCore, type ParameterAlias } from '..';

class PinejsClient extends PinejsClientCore {
	public requests: Array<Parameters<PinejsClientCore['_request']>[0]> = [];
	public _request(
		params: Parameters<PinejsClientCore['_request']>[0],
	): Promise<any> {
		this.requests.push(params);
		return Promise.resolve({ d: [] });
	}
}

describe('passthroughByMethod', () => {
	it('should be applied when set on the client', async () => {
		const client = new PinejsClient({
			apiPrefix: '/',
			passthroughByMethod: { GET: { a: 1 } },
		});
		await client.get({ resource: 'a' });
		expect(client.requests[0]).to.have.property('a', 1);
	});

	it('should not be accepted per request as it would be ignored', async () => {
		const client = new PinejsClient('/');
		await client.patch({
			resource: 'a',
			id: 1,
			body: {},
			// @ts-expect-error Use `passthrough` for a single request instead
			passthroughByMethod: { PATCH: { a: 1 } },
		});
		expect(client.requests[0]).to.not.have.property('a');
	});
});

describe('prepared parameter alias types', () => {
	it('should not allow null, as odata-parser cannot parse it', () => {
		const client = new PinejsClient('/');
		const params = {
			resource: 'a',
			options: { $filter: { b: { '@': 'b' } } },
		};
		const typeChecks = () => {
			// @ts-expect-error 'null' is not a valid parameter alias type
			client.prepare(params, { b: ['null', 'number'] });
			// @ts-expect-error null is not a valid parameter alias value
			const value: ParameterAlias = null;
			return value;
		};
		expect(typeChecks).to.be.a('function');
	});
});
