import * as PinejsClientCoreFactory from './core'
import * as request from 'request'
import * as Promise from 'bluebird'

export = class PinejsClientRequest extends PinejsClientCoreFactory.PinejsClientCore<PinejsClientRequest, Promise<{}>, Promise<number | PinejsClientCoreFactory.AnyObject | PinejsClientCoreFactory.AnyObject[]>> {
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
