# Pinejs Client #

This module provides the core layer for javascript interface for the pinejs API, there are multiple builds you can use, to set the version globally use [@balena/es-version](https://github.com/balena-io-modules/balena-es-version), eg:
```js
// Must be set before the first require
require('@balena/es-version').set('es5') // We support exact matches on es5 (default) / es2015 / es2018, see https://github.com/balena-io-modules/balena-es-version for a full list a possible versions
require('pinejs-client-core') // requires the version set above
```
or to force a specific version overriding the default (not recommended) you can use
```js
require('pinejs-client-core/es5') // es5
require('pinejs-client-core/es2015') // es2015/es6
require('pinejs-client-core/es2018') // es2018
```

For specific backends check out
* [pinejs-client-request](https://github.com/balena-io-modules/pinejs-client-request)
