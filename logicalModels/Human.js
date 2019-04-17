'use strict';

const Robot = require('logicalModels/Robot');
const {JsonSchemaModel, Method} = require('conventions/core');

/**
 *  Represents a human
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'Human',
	properties: {
		humanName: {type: 'string'},
		humanId: {type: 'string', format: 'uuid'},
	},
});

/**
 *  Minimum properties required to uniquely identify a Human
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports.Ids = JsonSchemaModel({
	$id: 'HumanIds',
	properties: {
		humanId: {type: 'string', format: 'uuid'},
	},
});

/**
 *  Method definitions
 */

module.exports.verifyIds = Method
	.setLogicalHandler({filename: 'verifyIds'});

module.exports.count = Method
	.stackIoMiddleware({filename: 'mq', eventName: 'human.count'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'count'});

module.exports.ensureIndex = Method
	.stackIoMiddleware({filename: 'cron', once: 'in 0 seconds'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'index', uniqueBy: ['humanId']})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'index', uniqueBy: ['humanName']});

module.exports.insert = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8080/humans', method: 'POST'})
	.stackIoMiddleware({filename: 'mq', eventName: 'human.add'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'insert'});

module.exports.find = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8080/humans/:humanId?', method: 'GET'})
	.stackIoMiddleware({filename: 'mq', eventName: 'human.read'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'find'});

module.exports.remove = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8080/humans/:humanId', method: 'DELETE'})
	.stackIoMiddleware({filename: 'mq', eventName: 'human.remove'})
	.stackIoMiddleware({filename: 'mongo', dbOpName: 'remove'});

module.exports.greetRobot = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8080/humans/:producerId/greet-robot/:receiverId', method: 'POST'})
	.setLogicalHandler({filename: 'give', producedType: 'Greeting', receiverType: 'Robot'});

module.exports.greetHuman = Method
	.stackIoMiddleware({filename: 'http', uri: 'http://localhost:8080/humans/:producerId/greet-human/:receiverId', method: 'POST'})
	.setLogicalHandler({filename: 'give', producedType: 'Greeting', receiverType: 'Human'});
