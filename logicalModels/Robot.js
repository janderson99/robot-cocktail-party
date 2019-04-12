'use strict';

const Human = require('logicalModels/Human');
const {JsonSchemaModel, Method} = require('conventions/core');

/**
 *  Represents a robot
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'Robot',
	properties: {
		robotName: {type: 'string'},
		robotId: {type: 'string', format: 'uuid'},
	},
});

/**
 *  Minimum properties required to uniquely identify a Robot
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports.Ids = JsonSchemaModel({
	$id: 'RobotIds',
	properties: {
		robotId: {type: 'string', format: 'uuid'},
	},
});

/**
 *  Method definitions
 */

module.exports.ensureIndex = Method
	.stackIoMiddleware({filename: 'cron', interval: '* * * * * *', until: Date.now()})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'index', uniqueBy: ['robotName']})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'index', uniqueBy: ['robotId']});

module.exports.insert = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8081/robots', method: 'POST'})
	.stackIoMiddleware({filename: 'mq', eventName: 'robot.add'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'insert'});

module.exports.find = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8081/robots/:robotId?', method: 'GET'})
	.stackIoMiddleware({filename: 'mq', eventName: 'robot.read'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'find'});

module.exports.remove = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8081/robots/:robotId', method: 'DELETE'})
	.stackIoMiddleware({filename: 'mq', eventName: 'robot.remove'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'remove'});

module.exports.greetRobot = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8081/robots/:greeterId/greet-robot/:greeteeId', method: 'POST'})
	.setLogicalHandler({filename: 'greet', Greetee: module.exports, salutation: 'Hello'});

module.exports.greetHuman = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8081/robots/:greeterId/greet-human/:greeteeId', method: 'POST'})
	.setLogicalHandler({filename: 'greet', Greetee: Human, salutation: 'Hey'});
