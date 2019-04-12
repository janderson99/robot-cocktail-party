'use strict';

const {JsonSchemaModel, Method} = require('conventions/core');

/**
 *  A record of interaction between a 'greeter' and a 'greetee'
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'Greeting',
	properties: {
		salutation: {type: 'string'},
		greeteeId: {type: 'string', format: 'uuid'},
		greeterId: {type: 'string', format: 'uuid'},
		greetingId: {type: 'string', format: 'uuid'},
		greeterType: {type: 'string', enum: ['Human', 'Robot']},
		greeteeType: {type: 'string', enum: ['Human', 'Robot']},
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
	properties: {
		greetingId: {type: 'string'},
	},
});

/**
 *  Method definitions
 */

module.exports.insert = Method
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'insert'});

module.exports.find = Method
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'find'})
	.stackIoMiddleware({filename: 'http', path: '/greetings', method: 'GET'});

module.exports.remove = Method
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'remove'})
	.stackIoMiddleware({filename: 'http', path: '/greetings', method: 'DELETE'});

module.exports.removeByRobotId = Method
	.setLogicalHandler({filename: 'execOpByLookup', dbOpName: 'remove', prop: 'greeterId', foreignProp: 'robotId'})
	.stackIoMiddleware({filename: 'mq', eventName: 'greetings.remove-by-robot-id', notifName: 'robots.remove'});

module.exports.removeByHumanId = Method
	.setLogicalHandler({filename: 'execOpByLookup', dbOpName: 'remove', prop: 'greeterId', foreignProp: 'humanId'})
	.stackIoMiddleware({filename: 'mq', eventName: 'greetings.remove-by-human-id', notifName: 'humans.remove'});
