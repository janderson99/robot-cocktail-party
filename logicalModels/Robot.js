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

module.exports.verifyIds = Method
	.setLogicalHandler({filename: 'verifyIds'});

module.exports.count = Method
	.stackIoMiddleware({filename: 'mq', eventName: 'robot.count'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'count'});

module.exports.ensureIndex = Method
	.stackIoMiddleware({filename: 'cron', once: 'in 0 seconds'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'index', uniqueBy: ['robotId']})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'index', uniqueBy: ['robotName']});

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
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8081/robots/:producerId/greet-robot/:receiverId', method: 'POST'})
	.setLogicalHandler({filename: 'give', producedType: 'Greeting', receiverType: 'Robot'});

module.exports.greetHuman = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8081/robots/:producerId/greet-human/:receiverId', method: 'POST'})
	.setLogicalHandler({filename: 'give', producedType: 'Greeting', receiverType: 'Human'});
