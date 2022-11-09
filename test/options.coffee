{ buildMochaHelper, test } = require './test'
_ = require 'lodash'

testId = buildMochaHelper it, (it, input, output) ->
	resource = 'test'
	if not _.isError(output)
		output = "#{resource}(#{output})"
	it "should compile #{JSON.stringify(input)} to #{output}", ->
		test output, {
			resource
			id: input
		}

testOption = buildMochaHelper it, (it, option, input, output) ->
	resource = 'test'
	if not _.isError(output)
		output = "#{resource}?#{option}=#{output}"
	it "should compile #{JSON.stringify(input)} to #{output}", ->
		test output, {
			resource
			options:
				"#{option}": input
		}

testOrderBy = _.partial(testOption, '$orderby')
testTop = _.partial(testOption, '$top')
testSkip = _.partial(testOption, '$skip')
testFormat = _.partial(testOption, '$format')
testSelect = _.partial(testOption, '$select')
testCustom = _.partial(testOption, 'custom')
testParam = _.partial(testOption, '@param')

testId(1, '1')
testId('Bob', "'Bob'")
testId({ '@': 'param' }, '@param')
testId({
	a: 1,
	b: 2
}, 'a=1,b=2')
testId({
	a: 'Bob',
	b: 'Smith'
}, "a='Bob',b='Smith'")
testId({
	a: { '@': 'param1' },
	b: { '@': 'param2' }
}, 'a=@param1,b=@param2')

testOrderBy(
	'a'
	'a'
)

testOrderBy(
	[ 'a', 'b' ]
	'a,b'
)

testOrderBy(
	a: 'desc'
	'a desc'
)

testOrderBy(
	[{
		a: 'desc'
	}, {
		b: 'asc'
	}]
	'a desc,b asc'
)

testOrderBy(
	[[ 'a' ]]
	new Error("'$orderby' cannot have nested arrays")
)

testOrderBy(
	a: 'x'
	new Error("'$orderby' direction must be 'asc' or 'desc'")
)

testOrderBy(
	a: 'asc'
	b: 'desc'
	new Error("'$orderby' objects must have exactly one element, got 2 elements")
)

testOrderBy(
	[]
	new Error("'$orderby' arrays have to have at least 1 element")
)

testOrderBy(
	1
	new Error("'$orderby' option has to be either a string, array, or object")
)

testOrderBy(
	a: { $count: {} }
	$dir: 'desc'
	'a/$count desc'
)

testOrderBy(
	a: { $count: $filter: d: 'e' }
	$dir: 'desc'
	"a/$count($filter=d eq 'e') desc"
)

testOrderBy(
	[{
		a: { $count: $filter: d: 'e' }
		$dir: 'desc'
	}, {
		b: { $count: {} }
		$dir: 'desc'
	}, {
		c: 'asc'
	}]
	"a/$count($filter=d eq 'e') desc,b/$count desc,c asc"
)

testOrderBy(
	a: $count: {}
	new Error(''''$orderby' objects should either use the '{ a: 'asc' }' or the $orderby: { a: { $count: ... }, $dir: 'asc' } notation''')
)

testOrderBy(
	a: $filter: d: 'e'
	$dir: 'desc'
	new Error('''When using '$orderby: { a: { $count: ... }, $dir: 'asc' }' you can only specify $count, got: '["$filter"]''')
)
testOrderBy(
	a: $count: $expand: 'e'
	$dir: 'desc'
	new Error('''When using '$orderby: { a: { $count: ... }, $dir: 'asc' }' you can only specify $filter in the $count, got: '["$expand"]''')
)
testOrderBy(
	a: $count:
		$expand: 'e'
		$filter: d: 'e'
	$dir: 'desc'
	new Error('''When using '$orderby: { a: { $count: ... }, $dir: 'asc' }' you can only specify $filter in the $count, got: '["$expand","$filter"]''')
)

testTop(
	1
	1
)

testTop(
	'1'
	new Error("'$top' option has to be a number")
)


testSkip(
	1
	1
)

testSkip(
	'1'
	new Error("'$skip' option has to be a number")
)


testFormat(
	'json;metadata=full'
	'json;metadata=full'
)

testFormat(
	'json;metadata=none'
	'json;metadata=none'
)


testSelect(
	'a'
	'a'
)

testSelect(
	[ 'a', 'b' ]
	'a,b'
)

testSelect(
	[]
	new Error("'$select' arrays have to have at least 1 element")
)

testSelect(
	1
	new Error("'$select' option has to be either a string or array")
)

testCustom(
	'a'
	'a'
)

testCustom(
	1
	'1'
)

testCustom(
	true
	'true'
)

testParam(
	'test'
	"'test'"
)

testParam(
	1
	'1'
)

testParam(
	{}
	new Error("Unknown type for parameter alias option '@param': object")
)
