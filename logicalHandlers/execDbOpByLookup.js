'use strict';

const DbOp = require('ioModels/DbOp');
const {JsonSchemaModel, Solution, Step} = require('conventions/core');

/**
 *  Options governing this handler's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'ExecDbOpByLookupOptions',
	required: [
		'prop',
		'Model',
		'dbOpName',
		'foreignProp',
	],
	properties: {
		prop: {type: 'string'},
		dbOpName: {type: 'string'},
		Model: {typeof: 'function'},
		foreignProp: {type: 'string'},
	},
});

/**
 *  Performs a given operation on any document whose specified property matches a given foreign property value
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

module.exports = Solution('parse options',  (scope, next) => {
	next({...Options(scope), ...DbOp(scope)});
});

Step('execute ${dbOpName} on ${Model.name} documents',  ({Model, dbOpName, prop, foreignProp, ...scope}, next) => {
	const foreignVal = scope[foreignProp];
	const query = {[prop]: {$in: [foreignVal]}};
	Model[dbOpName]({...scope, criteria: query}, next);
});
