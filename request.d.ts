import * as PinejsClientCoreFactory from './core'
import * as request from 'request'

export = class PinejsClientRequest extends PinejsClientCoreFactory.PinejsClientCore<PinejsClientRequest> {
	constructor(
		params: string | PinejsClientCoreFactory.Params,
		backendParams: {
			cache: {
				[index: string]: any
			}
		}
	)

	_request: (params: request.Options) => Promise<{}>
}
