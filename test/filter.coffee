{ test } = require './test'

testFilter = (input, output) ->
	resource = 'test'
	url = resource + '?$filter=' + output
	it "should compile #{JSON.stringify(input)} to #{url}", ->
		test url, {
			resource
			options:
				filter: input
		}

testFilter(
	a: 'b'
	d: 'e'
	"((a eq 'b') and (d eq 'e'))"
)

testOperator = (operator) ->
	createFilter = (partialFilter) ->
		"$#{operator}": partialFilter

	testFilter(
		createFilter
			a: 'b'
			c: 'd'
		"((a eq 'b') #{operator} (c eq 'd'))"
	)

	testFilter(
		createFilter [
			a: 'b'
		,
			c: 'd'
		]
		"((a eq 'b') #{operator} (c eq 'd'))"
	)

	testFilter(
		a: createFilter 'b'
		"a #{operator} 'b'"
	)

	testFilter(
		a: createFilter [
			'b'
			'c'
		]
		"a eq (('b') #{operator} ('c'))"
	)

	testFilter(
		a: createFilter
				b: 'c'
				d: 'e'
		"a eq ((b eq 'c') #{operator} (d eq 'e'))"
	)

testFunction = (funcName) ->
	createFilter = (partialFilter) ->
		filter = {}
		filter['$' + funcName] = partialFilter
		return filter

	testFilter(
		createFilter
			a: 'b'
			c: 'd'
		"#{funcName}((a eq 'b'),(c eq 'd'))"
	)

	testFilter(
		createFilter [
			a: 'b'
		,
			c: 'd'
		]
		"#{funcName}((a eq 'b'),(c eq 'd'))"
	)

	testFilter(
		a: createFilter 'b'
		"#{funcName}(a,'b')"
	)

	testFilter(
		a: createFilter [
			'b'
			'c'
		]
		"a eq #{funcName}(('b'),('c'))"
	)

	testFilter(
		a: createFilter
				b: 'c'
				d: 'e'
		"a eq #{funcName}((b eq 'c'),(d eq 'e'))"
	)

testOperator('ne')
testOperator('eq')
testOperator('gt')
testOperator('ge')
testOperator('lt')
testOperator('le')

# Test operands
testFilter(
	a: 'b'
	"a eq 'b'"
)
testFilter(
	a: 1
	'a eq 1'
)
testFilter(
	a: true
	'a eq true'
)
testFilter(
	a: false
	'a eq false'
)
testFilter(
	a: null
	'a eq null'
)


# Test mixing operators
testFilter(
	$ne: [
		$eq:
			a: 'b'
			c: 'd'
	,
		e: 'f'
	]
	"((((a eq 'b') eq (c eq 'd'))) ne (e eq 'f'))"
)

testFilter(
	[
		$eq:
			a: 'b'
			c: 'd'
	,
		$ne:
			e: 'f'
			g: 'h'
	]
	"((((a eq 'b') eq (c eq 'd'))) or (((e eq 'f') ne (g eq 'h'))))"
)

testFilter(
	$ne: [
		$eq: [
			a: 'b'
		,
			d: 'e'
		]
	,
		c: 'd'
	]
	"((((a eq 'b') eq (d eq 'e'))) ne (c eq 'd'))"
)

testFilter(
	a:
		b: 'c'
	"a/b eq 'c'"
)

testFilter(
	a:
		b: 'c'
		d: 'e'
	"((a/b eq 'c') and (a/d eq 'e'))"
)

testFilter(
	a: [
		b: 'c'
	,
		d: 'e'
	]
	"a eq ((b eq 'c') or (d eq 'e'))"
)

testFilter(
	a: [
		'c'
		'd'
	]
	"a eq (('c') or ('d'))"
)

testFilter(
	a:
		b: [
			'c'
			'd'
		]
	"a/b eq (('c') or ('d'))"
)

testFilter(
	a:
		[
			b: 'c'
			'd'
		]
	"a eq ((b eq 'c') or ('d'))"
)

testFilter(
	a:
		b: 'c'
		$eq: 'd'
	"((a/b eq 'c') and (a eq 'd'))"
)

# Test raw strings
testFilter(
	$raw: "(a/b eq 'c' and a eq 'd')"
	"(a/b eq 'c' and a eq 'd')"
)

testFilter(
	[
		$raw: 'a ge b'
	,
		$raw: 'a le c'
	]
	"((a ge b) or (a le c))"
)

testFilter(
	a:
		b: [
			$raw: 'c ge d'
		,
			$raw: 'd le e'
		]
	"a/b eq ((c ge d) or (d le e))"
)

testFilter(
	a:
		b:
			$and: [
				$raw: 'c ge d'
			,
				$raw: 'e le f'
			]
	"a/b eq ((c ge d) and (e le f))"
)

# Test $and
testFilter(
	a:
		b:
			$and: [
				'c'
				'd'
			]
	"a/b eq (('c') and ('d'))"
)

testFilter(
	a:
		b:
			$and: [
				c: 'd'
			,
				e: 'f'
			]
	"a/b eq ((c eq 'd') and (e eq 'f'))"
)

# Test $or
testFilter(
	a:
		b:
			$or: [
				'c'
				'd'
			]
	"a/b eq (('c') or ('d'))"
)

testFilter(
	a:
		b:
			$or: [
				c: 'd'
			,
				e: 'f'
			]
	"a/b eq ((c eq 'd') or (e eq 'f'))"
)

# Test $in
testFilter(
	a:
		b:
			$in: [
				'c'
				'd'
			]
	"((a/b eq 'c') or (a/b eq 'd'))"
)

testFilter(
	a:
		b:
			$in: [
				c: 'd'
			,
				e: 'f'
			]
	"((a/b/c eq 'd') or (a/b/e eq 'f'))"
)

testFilter(
	a:
		b:
			$in:
				c: 'd'
				e: 'f'
	"((a/b/c eq 'd') or (a/b/e eq 'f'))"
)

testFilter(
	a:
		b:
			$in: 'c'
	"a/b eq 'c'"
)

# Test $not
testFilter(
	$not: 'a'
	"not('a')"
)

testFilter(
	$not:
		a: 'b'
	"not(a eq 'b')"
)

testFilter(
	$not:
		a: 'b'
		c: 'd'
	"not(((a eq 'b') and (c eq 'd')))"
)

testFilter(
	$not: [
		a: 'b'
	,
		c: 'd'
	]
	"not(((a eq 'b') or (c eq 'd')))"
)

testFilter(
	a:
		$not: 'b'
	"a eq not('b')"
)

testFilter(
	a:
		$not: [
			'b'
			'c'
		]
	"a eq not((('b') or ('c')))"
)

testFilter(
	a:
		$not:
			b: 'c'
			d: 'e'
	"a eq not(((b eq 'c') and (d eq 'e')))"
)

testFilter(
	a:
		$not: [
			b: 'c'
		,
			d: 'e'
		]
	"a eq not(((b eq 'c') or (d eq 'e')))"
)

# Test $add
testOperator('add')

# Test $sub
testOperator('sub')

# Test $mul
testOperator('mul')

# Test $div
testOperator('div')

# Test $mod
testOperator('mod')

# Test $
testFilter(
	a:
		$: 'b'
	"a eq b"
)

testFilter(
	a:
		b:
			$: 'c'
	"a/b eq c"
)

testFilter(
	a:
		b:
			$: ['c', 'd']
	"a/b eq c/d"
)

# Test functions
testFunction('contains')
testFunction('endswith')
testFunction('startswith')
testFunction('length')
testFunction('indexof')
testFunction('substring')
testFunction('tolower')
testFunction('toupper')
testFunction('trim')
testFunction('concat')
testFunction('year')
testFunction('month')
testFunction('day')
testFunction('hour')
testFunction('minute')
testFunction('second')
testFunction('fractionalseconds')
testFunction('date')
testFunction('time')
testFunction('totaloffsetminutes')
testFunction('now')
testFunction('maxdatetime')
testFunction('mindatetime')
testFunction('totalseconds')
testFunction('round')
testFunction('floor')
testFunction('ceiling')
testFunction('isof')
testFunction('cast')

# Test a one param function
testFilter(
	$eq: [
		$tolower: $: 'a'
	,
		$tolower: 'b'
	]
	"((tolower(a)) eq (tolower('b')))"
)