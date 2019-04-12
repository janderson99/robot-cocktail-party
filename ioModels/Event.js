'use strict';

const {JsonSchemaModel, Method} = require('conventions/core');

/**
 *  Represents a request for an action to be taken
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'Event',
	properties: {
		extra: {type: 'object'},
		eventId: {type: 'string', format: 'uuid'},
		eventNameCode: {
			properties: {
				codeValue: {type: 'string'},
			},
		},
		data: {
			properties: {
				eventContext: {type: 'object'},
				transform: {
					properties: {
						human: {$ref: 'Human'},
						robot: {$ref: 'Robot'},
						greeting: {$ref: 'Greeting'},
						queryParameter: {type: 'string'},
					},
				},
			},
		},
	},
});

/**
 *  Minimum properties required to uniquely identify an Event
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports.Ids = JsonSchemaModel({
	$id: 'EventIds',
	required: [
		'eventId',
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
