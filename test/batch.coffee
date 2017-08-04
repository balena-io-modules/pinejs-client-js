{ testBatch } = require './test'
ppJson = (json) -> JSON.stringify(json, null, 2)
testBatchReq = (input, output) ->
	it "should compile #{ppJson(input)} to #{ppJson(output)}", ->
		testBatch output, input

dev1 =
	name: 'First'
	devtype: 'b1'

dev2 =
	name: 'Second'
	devtype: 'b2'

dev3 =
	name: 'Third'
	devtype: 'cs1'

dev4 =
	name: 'Fourth'
	devtype: 'cs2'

req1 = {
	url: '/testpine/device'
	method: 'POST'
	body: dev1
}
req2 = {
	url: '/testpine/device'
	method: 'POST'
	body: dev2
}
req3 = {
	url: '/testpine/device'
	method: 'GET'
}

cs1 = {
	url: '$2'
	method: 'PUT'
	'Content-ID': 1
	body: dev4
}

cs2 = {
	url: '/testpine/device'
	method: 'POST'
	'Content-ID': 2
	body: dev3
}


req1Compiled = {
	'body': 'POST /testpine/device HTTP/1.1\r\n{\"name\":\"First\",\"devtype\":\"b1\"}',
	'Content-Transfer-Encoding': 'binary',
	'Content-Type': 'application/json'
}

req2Compiled = {
	'body': 'POST /testpine/device HTTP/1.1\r\n{\"name\":\"Second\",\"devtype\":\"b2\"}',
	'Content-Transfer-Encoding': 'binary',
	'Content-Type': 'application/json'
}

req3Compiled = {
	'Content-Transfer-Encoding': 'binary',
	'Content-Type': 'application/http',
	'body': 'GET /testpine/device HTTP/1.1\r\n'
}

cs1Compiled = {
	'Content-Type': 'application/json',
	'Content-ID': 1,
	'Content-Transfer-Encoding': 'binary',
	'body': 'PUT $2 HTTP/1.1\r\n{\"name\":\"Fourth\",\"devtype\":\"cs2\"}'
}

cs2Compiled = {
	'Content-Type': 'application/json',
	'Content-ID': 2,
	'Content-Transfer-Encoding': 'binary',
	'body': 'POST /testpine/device HTTP/1.1\r\n{\"name\":\"Third\",\"devtype\":\"cs1\"}'

}

testBatchReq(
	[ req1, req2 ]
	[ req1Compiled, req2Compiled ]
)

testBatchReq(
	[ req1, [ cs1, cs2 ], req3 ]
	[ req1Compiled, [ cs1Compiled, cs2Compiled ], req3Compiled ]
)

testBatchReq(
	[ [ cs2, cs1 ], req3, req2, req1 ]
	[ [ cs2Compiled, cs1Compiled ], req3Compiled, req2Compiled, req1Compiled ]
)
