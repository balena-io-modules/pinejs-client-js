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

	describe('should reject an invalid natural key before making any requests', () => {
		const cases: Array<{
			title: string;
			id: object;
			message: string;
		}> = [
			{
				title: 'an aliased primary key',
				id: { '@': 'p' },
				message:
					'The id property must be an object with the natural key of the model',
			},
			{
				title: 'a natural key property name that is an operator',
				id: { $raw: '1 eq 1' },
				message: `Natural key property names must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: "$raw"`,
			},
			{
				title: 'a natural key property name that is filter syntax',
				id: { 'id gt 0 or id': 0 },
				message: `Natural key property names must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: "id gt 0 or id"`,
			},
			{
				title: 'a natural key property name that is a path',
				id: { 'b/c': 'x' },
				message: `Natural key property names must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: "b/c"`,
			},
			...['1', '-1', 'null', 'true', "'x'", 'é', ''].map((key) => ({
				title: `a natural key property name of ${JSON.stringify(key)}`,
				id: { [key]: 0 },
				message: `Natural key property names must start with a letter or '_', only contain [A-Za-z0-9-._~] and not be 'null', 'true' or 'false', got: ${JSON.stringify(key)}`,
			})),
			{
				title: 'a parameter alias',
				id: { b: { '@': 'u' } },
				message: "Unknown type for the id property 'b': object",
			},
			{
				title: 'a nested array',
				id: { b: ['x'] },
				message: "Unknown type for the id property 'b': object",
			},
			{
				title: 'an undefined value',
				id: { b: undefined },
				message: "Unknown type for the id property 'b': undefined",
			},
			{
				title: 'a NaN value',
				id: { b: NaN },
				message: "The id property 'b' must be a finite number, got: NaN",
			},
			{
				title: 'an Infinity value',
				id: { b: Infinity },
				message: "The id property 'b' must be a finite number, got: Infinity",
			},
			{
				title: 'an Invalid Date',
				id: { b: new Date(NaN) },
				message: "The id property 'b' is an Invalid Date",
			},
			{
				title: 'a string with a lone surrogate',
				id: { b: '\uD800' },
				message: "The id property 'b' must not contain lone surrogates",
			},
		];
		for (const { title, id, message } of cases) {
			it(title, async () => {
				const client = new PinejsClient(new Error('Unexpected request'));
				let error: unknown;
				try {
					await client.upsert({ resource: 'a', id, body: { c: 1 } });
				} catch (err) {
					error = err;
				}
				expect(error).to.be.instanceOf(Error);
				expect((error as Error).message).to.equal(message);
				expect(client.requests).to.deep.equal([]);
			});
		}
	});

	it('should accept null and boolean natural key values', async () => {
		const client = new PinejsClient(
			new StatusError('Unique key constraint violated', 409),
		);
		await client.upsert({
			resource: 'a',
			id: { b: null, c: true },
			body: { d: 1 },
		});
		expect(client.requests).to.deep.equal([
			{ method: 'POST', url: '/a', body: { d: 1, b: null, c: true } },
			{
				method: 'PATCH',
				url: '/a?$filter=b eq null and c eq true',
				body: { d: 1 },
			},
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

	it('should reject an undefined body value for a natural key property', async () => {
		const client = new PinejsClient(
			new StatusError('Unique key constraint violated', 409),
		);
		try {
			await client.upsert({
				resource: 'a',
				id: { slug: 'c' },
				body: { slug: undefined, name: 'b' },
			});
			expect.fail('Expected upsert to throw');
		} catch (e: any) {
			expect(e.message).to.equal(
				"The body property 'slug' is undefined, omit it to use the value from the id property",
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
});
