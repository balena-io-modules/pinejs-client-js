import { expect } from 'chai';
import type { RetryParametersObj } from '..';
import { PinejsClientCore } from '..';

class PinejsClient extends PinejsClientCore {
	public _request(): Promise<any> {
		return Promise.resolve({ d: [] });
	}
}

const expectRetryError = async (retry: RetryParametersObj, message: string) => {
	const client = new PinejsClient({ apiPrefix: '/', retry });
	try {
		await client.get({ resource: 'a' });
	} catch (err: any) {
		expect(err).to.be.an('error');
		expect(err.message).to.equal(message);
		return;
	}
	throw new Error('Expected the request to be rejected');
};

describe('retry parameter validation', () => {
	it('should report an invalid minDelayMs', async () => {
		await expectRetryError(
			{ minDelayMs: 0, maxDelayMs: 100, maxAttempts: 3 },
			"pinejs-client minDelayMs must be a positive integer, got: '0'",
		);
	});

	it('should report an invalid maxDelayMs', async () => {
		await expectRetryError(
			{ minDelayMs: 10, maxDelayMs: -1, maxAttempts: 3 },
			"pinejs-client maxDelayMs must be a positive integer, got: '-1'",
		);
	});

	it('should report an invalid maxAttempts', async () => {
		await expectRetryError(
			{ minDelayMs: 10, maxDelayMs: 100, maxAttempts: 0 },
			"pinejs-client maxAttempts must be a positive integer, got: '0'",
		);
	});
});
