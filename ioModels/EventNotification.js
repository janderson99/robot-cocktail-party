'use strict';

const {JsonSchemaModel, Method} = require('conventions/core');

/**
 *  Broadcasts an action's successful completion
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'EventNotification',
	allOf: [{$ref: 'EventResult'}],
	statusCode: {default: undefined}
});

/**
 *  Minimum properties required to uniquely identify an EventResult
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports.Ids = JsonSchemaModel({
	$id: 'EventNotificationIds',
	required: [
		'eventId'
	],
	properties: {
		eventId: {type: 'string', format: 'uuid'},
	},
});

/**
 *  Method definitions
 */

module.exports.find = Method
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'find'});

module.exports.insert = Method
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'insert'});
