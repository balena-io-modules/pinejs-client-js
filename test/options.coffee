{ test } = require './test'
_ = require 'lodash'

testOption = (option, input, output) ->
	resource = 'test'
	if not _.isError(output)
		output = "#{resource}?$#{option}=#{output}"
	it "should compile #{JSON.stringify(input)} to #{output}", ->
		test output, {
			resource
			options:
				"#{option}": input
		}

testOrderBy = _.partial(testOption, 'orderby')
testTop = _.partial(testOption, 'top')
testSkip = _.partial(testOption, 'skip')
testSelect = _.partial(testOption, 'select')


testOrderBy(
	'a'
	'a'
)

testOrderBy(
	[ 'a', 'b' ]
	'a,b'
)

testOrderBy(
	1
	new Error("'$orderby' option has to be either a string or array")
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


testSelect(
	'a'
	'a'
)

testSelect(
	[ 'a', 'b' ]
	'a,b'
)

testSelect(
	1
	new Error("'$select' option has to be either a string or array")
)
