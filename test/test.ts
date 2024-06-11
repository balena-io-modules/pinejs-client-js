import { expect } from 'chai';
import * as _ from 'lodash';
import { PinejsClientCore } from '..';

// Create a class for tests that extends the exported abstract class
class PinejsClient extends PinejsClientCore<PinejsClient> {
	public async _request(): Promise<any> {
		return;
	}
}

const core = new PinejsClient('/resin');
export function test(expected: Error, params: any): void;
export function test(
	expected: string | Error,
	params: Parameters<PinejsClientCore['compile']>[0],
): void;
export function test(
	expected: string | Error,
	params: Parameters<PinejsClientCore['compile']>[0],
): void {
	if (_.isError(expected)) {
		expect(() => core.compile(params)).to.throw(
			expected.constructor,
			expected.message,
		);
	} else {
		expect(core.compile(params)).to.equal(expected);
	}
}
