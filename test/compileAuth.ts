import type Model from './balena-model';
import { PinejsClientCore } from '..';
import { expect } from 'chai';

class PinejsClient extends PinejsClientCore<Model> {
	public async _request(): Promise<any> {
		return;
	}
}
export const core = new PinejsClient('/resin');

const matchesActor = {
	actor: {
		'@': '__ACTOR_ID',
	},
};

const matchesUser = {
	user: {
		$any: {
			$alias: 'u',
			$expr: {
				u: matchesActor,
			},
		},
	},
};

it('should compile a simple auth', () => {
	const result = core.compileAuth({
		modelName: 'resin',
		resource: 'actor',
		access: 'read',
	});

	expect(result).to.equal('resin.actor.read');
});

it('should compile a auth with a $filter', () => {
	const result = core.compileAuth({
		modelName: 'resin',
		resource: 'actor',
		access: 'delete',
		options: {
			$filter: {
				id: {
					'@': '__ACTOR_ID',
				},
			},
		},
	});

	expect(result).to.equal('resin.actor.delete?id eq @__ACTOR_ID');
});

it('should compile a auth with a complex $filter', () => {
	const result = core.compileAuth({
		modelName: 'resin',
		resource: 'user__has__public_key',
		access: 'all',
		options: {
			$filter: matchesUser,
		},
	});

	expect(result).to.equal(
		'resin.user__has__public_key.all?user/any(u:u/actor eq @__ACTOR_ID)',
	);
});

it('should compile a auth with a $canAccess $filter', () => {
	const result = core.compileAuth({
		modelName: 'resin',
		resource: 'application_tag',
		access: 'read',
		options: {
			$filter: {
				application: {
					$canAccess: true,
				},
			},
		},
	});

	expect(result).to.equal('resin.application_tag.read?application/canAccess()');
});

it('should compile a auth with a complex $canAccess $filter', () => {
	const result = core.compileAuth({
		modelName: 'resin',
		resource: 'application',
		access: 'read',
		options: {
			$filter: {
				$or: {
					owns__device: {
						$canAccess: true,
					},
					$and: {
						is_public: true,
						is_for__device_type: {
							$any: {
								$alias: 'dt',
								$expr: {
									dt: {
										describes__device: {
											$canAccess: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	expect(result).to.equal(
		'resin.application.read?(owns__device/canAccess()) or ((is_public eq true) and (is_for__device_type/any(dt:dt/describes__device/canAccess())))',
	);
});

// it('should compile a auth with a complex $canAccess $filter', () => {
// 	const result = core.compile({
// 		resource: 'application',
// 		options: {
// 			$filter: {
// 				$or: {
// 					owns__device: {
// 						$eq: true,
// 					},
// 					$and: {
// 						is_public: true,
// 						is_for__device_type: {
// 							$any: {
// 								$alias: 'dt',
// 								$expr: {
// 									dt: {
// 										describes__device: {
// 											$eq: true,
// 										},
// 									},
// 								},
// 							},
// 						},
// 					},
// 				},
// 			},
// 		},
// 	});

// 	expect(result).to.equal('resin.application.read?owns__device/canAccess() or (is_public eq true and is_for__device_type/any(dt:dt/describes__device/canAccess()))');
// });

// it('should compile a auth with a $canAccess $filter', () => {
// 	const result = core.compile({
// 		resource: 'application_tag',
// 		options: {
// 			$filter: {
// 				application: {
// 					$canAccess: true,
// 				},
// 			},
// 		},
// 	});

// 	expect(result).to.equal('resin.application_tag.read?application/canAccess()');
// });
