'use strict';

const {JsonSchemaModel} = require('conventions/core');

/**
 *  Represents a database query
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'DbOp',
	properties: {
		skip: {type: 'number'},
		sort: {type: 'object'},
		limit: {type: 'number'},
		project: {type: 'object'},
		criteria: {type: 'object'},
		increment: {type: 'object'},
		uniqueBy: {
			minItems: 1,
			items: {type: 'string'},
		},
	},
});

/**
 *  Represents a database query result
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports.Result = JsonSchemaModel({
	$id: 'DbOpResult',
	properties: {
		resultCount: {type: 'number', default: 0},
	},
	additionalProperties: {
		type: 'array', items: {type: 'object'},
	}
});

