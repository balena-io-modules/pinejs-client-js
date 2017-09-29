{ compile, testBatch } = require './test'
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
	resource: 'device'
	method: 'POST'
	body: dev1
}

req2 = {
	resource: 'device'
	method: 'POST'
	body: dev2
}

req3 = {
	resource: 'device'
	method: 'GET'
	options:
		filter:
			name: 'First'
}

cs1 = {
	url: '$2'
	method: 'PUT'
	body: dev4
	headers:
		'Content-ID': 1
}

cs2 = {
	resource: 'device'
	method: 'POST'
	body: dev3
	headers:
		'Content-ID': 2
}

cs3 = {
	resource: 'device'
	method: 'GET'
	headers:
		'Content-ID': 3
	options:
		expand: a: $filter: b: 'c'
}

req1Compiled = {
	'body': 'POST /device HTTP/1.1\r\n{\"name\":\"First\",\"devtype\":\"b1\"}',
	'Content-Transfer-Encoding': 'binary',
	'Content-Type': 'application/json'
}

req2Compiled = {
	'body': 'POST /device HTTP/1.1\r\n{\"name\":\"Second\",\"devtype\":\"b2\"}',
	'Content-Transfer-Encoding': 'binary',
	'Content-Type': 'application/json'
}

req3Compiled = {
	'Content-Transfer-Encoding': 'binary',
	'Content-Type': 'application/http',
	'body': "GET /#{compile(req3)} HTTP/1.1\r\n"
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
	'body': 'POST /device HTTP/1.1\r\n{\"name\":\"Third\",\"devtype\":\"cs1\"}'
}

cs3Compiled = {
	'Content-Type': 'application/http',
	'Content-ID': 3,
	'Content-Transfer-Encoding': 'binary'
	'body': "GET /#{compile(cs3)} HTTP/1.1\r\n"
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

testBatchReq(
	[ [ cs1, cs2, cs3 ], req3 ]
	[ [ cs1Compiled, cs2Compiled, cs3Compiled ], req3Compiled ]
)
