'use strict';

var tap = require('tap');

var provingGround = require('../');

tap.test('API', function (t) {
	t.autoend();

	t.type(
		provingGround.run,
		'function',
		'exports a `run` method'
	);
});
