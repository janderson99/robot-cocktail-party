'use strict';

const {JsonSchemaModel, Solution, Step} = require('conventions/core');

/**
 *  Options governing this handler's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'ReplaceMeOptions',
	required: [
		'Model',
	],
	properties: {
		Model: {typeof: 'function'},
	},
});

/**
 *  Replace this sentence with a description of the below Solution
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

module.exports = Solution('parse options', (scope, next) => {
	next(Options(scope));
});

Step('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be added to below step's scope */});
});

Step('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be added to below step's scope */});
});

Step('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be given to callback */});
});