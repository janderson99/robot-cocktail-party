'use strict';

const path = require('path');
const hostModel = path.basename(process.argv[1], '.js');
const {JsonSchemaModel, Solution, Step} = require('conventions/core');

/**
 *  Options governing this solution's behavior
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
 *  Determines which handlers (if any) to apply
 *  @param {Object} options
 *  @return {Function|void} handler
 */

module.exports = options => {
	const {Model} = Options(options);
	const isBrowser = typeof window === 'object';
	const isHostServer = hostModel === Model.name;
	if (isHostServer) _handleInboundRequests(options);
	if (!isBrowser) return _handleOutboundRequests(options);
};

/**
 *  Replace this sentence with a description of the below Solution
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _handleInboundRequests = Solution('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be added to below steps' scope */});
});

Step('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be added to below steps' scope */});
});

Step('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be given to callback */});
});

/**
 *  Replace this sentence with a description of the below Solution
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _handleOutboundRequests = Solution('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be added to below step's scope */});
});

Step('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be added to below step's scope */});
});

Step('replace this sentence with a short description', (scope, next) => {
	next({/* Replace this comment with properties to be given to callback */});
});
