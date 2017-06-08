import * as PinejsClientCoreFactory from './core'
import * as request from 'request'
import * as Promise from 'bluebird'

declare class PinejsClientRequest extends PinejsClientCoreFactory.PinejsClientCore<PinejsClientRequest, Promise<{}>, Promise<PinejsClientCoreFactory.PromiseResultTypes>> {
	constructor(
		params: string | PinejsClientCoreFactory.Params,
		backendParams?: {
			cache: {
				[index: string]: any
			}
		}
	)

	_request(params: request.Options): Promise<{}>
}

export = PinejsClientRequest
