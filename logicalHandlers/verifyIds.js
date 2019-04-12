'use strict';

const {JsonSchemaModel, Solution, Step, Reject} = require('conventions/core');

/**
 *  Options governing this Rejectr's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'VerifyIdsOptions',
	required: [
		'Model',
	],
	properties: {
		Model: {typeof: 'function'},
	}
});

/**
 *  Verifies that the given Ids match exactly 1 document
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

module.exports = Solution('count ${Model.name} docs with given IDs', ({Model, scope}, next) => {
	const query = Model.Ids(scope);
	Model.count({...scope, query}, next);
});

Step('confirm given IDs match exactly 1 ${Model.name} doc', ({Model, resultCount, ...scope}, next) => {
	resultCount === 1 ? next() : next(Reject(`Given Ids matched ${resultCount} ${Model.name} documents`));
});