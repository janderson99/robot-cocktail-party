'use strict';

const {JsonSchemaModel, Method} = require('conventions/core');

/**
 *  Represents the result of an action
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'EventResult',
	properties: {
		eventId: {type: 'string', format: 'uuid'},
		extra: {type: 'object'},
		statusCode: {type: 'number'},
		eventNameCode: {
			properties: {
				codeValue: {type: 'string'},
			},
		},
		confirmMessage: {
			properties: {
				userMessage: {type: 'string'},
				developerMessage: {type: 'string'},
			},
		},
		eventStatusCode: {
			properties: {
				codeValue: {type: 'string', enum: ['failed', 'completed']},
			},
		},
		data: {
			properties: {
				eventContext: {type: 'object'},
				output: {
					properties: {
						robots: {items: {$ref: 'Robot'}},
						humans: {items: {$ref: 'Human'}},
						greetings: {items: {$ref: 'Greeting'}},
					},
				},
			},
		},
	},
});

/**
 *  Minimum properties required to uniquely identify an EventResult
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports.Ids = JsonSchemaModel({
	$id: 'EventResultIds',
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
