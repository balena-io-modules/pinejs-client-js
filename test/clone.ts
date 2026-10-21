import { expect } from 'chai';
import { PinejsClientCore } from '..';

class PinejsClient extends PinejsClientCore {
	public _request(): Promise<any> {
		return Promise.resolve({ d: [] });
	}
}

describe('clone', () => {
	const createClient = () =>
		new PinejsClient({
			apiPrefix: '/',
			passthrough: { a: 1 },
			passthroughByMethod: { GET: { b: 2 } },
			retry: { minDelayMs: 1, maxDelayMs: 10, maxAttempts: 3 },
		});

	it('should not share params objects with the original', () => {
		const original = createClient();
		const clone = original.clone({});

		clone.passthrough.c = 3;
		clone.passthroughByMethod.GET.d = 4;
		clone.passthroughByMethod.POST = { e: 5 };
		if (clone.retry !== false) {
			clone.retry.maxAttempts = 10;
		}

		expect(original.passthrough).to.deep.equal({ a: 1 });
		expect(original.passthroughByMethod).to.deep.equal({ GET: { b: 2 } });
		expect(original.retry).to.deep.equal({
			minDelayMs: 1,
			maxDelayMs: 10,
			maxAttempts: 3,
		});

		original.passthrough.f = 6;
		expect(clone.passthrough).to.deep.equal({ a: 1, c: 3 });
	});

	it('should still replace rather than merge params passed to clone', () => {
		const clone = createClient().clone({ passthrough: { g: 7 } });
		expect(clone.passthrough).to.deep.equal({ g: 7 });
		expect(clone.passthroughByMethod).to.deep.equal({ GET: { b: 2 } });
	});
});
