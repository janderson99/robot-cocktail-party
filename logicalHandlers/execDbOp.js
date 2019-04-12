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
	$id: 'ExecDbOpOptions',
	required: [
		'Model',
		'dbOpName',
	],
	properties: {
		dbOpName: {type: 'string'},
		Model: {typeof: 'function'},
	},
});

/**
 *  Performs a Db operation by the given `dbOpName`
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

module.exports = Solution('parse options',  (scope, next) => {
	next({...Options(scope), ...DbOp(scope)});
});

Step('execute ${Model.name}.${dbOpName}',  ({Model, dbOpName, ...scope}, next) => {
	Model[dbOpName](scope, next);
});
