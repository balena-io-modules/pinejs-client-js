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
export function test(expected: any, params: any) {
	if (_.isError(expected)) {
		expect(() => core.compile(params)).to.throw(
			expected.constructor,
			expected.message,
		);
	} else {
		expect(core.compile(params)).to.equal(expected);
	}
}

export function buildMochaHelper(mochaFn: any, runExpectation: any) {
	const ret = runExpectation.bind(null, mochaFn);
	ret.skip = runExpectation.bind(null, mochaFn.skip);
	ret.only = runExpectation.bind(null, mochaFn.only);
	return ret;
}
