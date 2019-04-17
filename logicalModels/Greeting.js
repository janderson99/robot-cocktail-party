'use strict';

const {JsonSchemaModel, Method} = require('conventions/core');

/**
 *  A greeting
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'Greeting',
	properties: {
		greetingId: {type: 'string', format: 'uuid'},
		producerId: {type: 'string', format: 'uuid'},
		receiverId: {type: 'string', format: 'uuid'},
		producerType: {type: 'string', enum: ['Human', 'Robot']},
		receiverType: {type: 'string', enum: ['Human', 'Robot']},
	},
});

/**
 *  Minimum properties required to uniquely identify a Greeting
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports.Ids = JsonSchemaModel({
	$id: 'GreetingIds',
	anyOf: [{
		properties: {
			greetingId: {type: 'string'},
		},
	}, {
		properties: {
			producerId: {type: 'string'},
			receiverId: {type: 'string'},
			producerType: {type: 'string'},
			receiverType: {type: 'string'},
		},
	}],
});

/**
 *  Method definitions
 */

module.exports.insert = Method
	.stackIoMiddleware({filename: 'mq', eventName: 'greeting.add'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'insert'});

module.exports.ensureIndex = Method
	.stackIoMiddleware({filename: 'cron', once: 'in 0 seconds'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'index', uniqueBy: ['greetingId']})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'index', uniqueBy: ['producerId', 'receiverId']});

module.exports.find = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8082/greetings/:greetingId?', method: 'GET'})
	.stackIoMiddleware({filename: 'mq', eventName: 'greeting.read'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'find'});

module.exports.remove = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8082/greetings/:greetingId', method: 'DELETE'})
	.stackIoMiddleware({filename: 'mq', eventName: 'greeting.remove'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'remove'});

module.exports.removeByRobotId = Method
	.stackIoMiddleware({filename: 'mq', eventName: 'greeting.remove-by-robot-id', notifName: 'robot.remove'})
	.setLogicalHandler({filename: 'execOpByLookup', dbOpName: 'remove', prop: 'producerId', foreignProp: 'robotId'});

module.exports.removeByHumanId = Method
	.stackIoMiddleware({filename: 'mq', eventName: 'greeting.remove-by-human-id', notifName: 'human.remove'})
	.setLogicalHandler({filename: 'execOpByLookup', dbOpName: 'remove', prop: 'producerId', foreignProp: 'humanId'});
