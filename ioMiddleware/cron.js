'use strict';

let worker;
const path = require('path');
const logicalHandlersById = {};
const {MongoClient} = require('mongodb');
const {MongoCron} = require('mongodb-cron');
const hostModel = path.basename(process.argv[1], '.js');
const {JsonSchemaModel, Solution, Step} = require('conventions/core');
const mongoClient = new MongoClient(process.env.MKPLDB, {useNewUrlParser: true});

/**
 *  Options governing this solution's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'CronOptions',
	required: [
		'Model',
		'interval',
	],
	properties: {
		interval: {type: 'string'},
		Model: {typeof: 'function'},
		start: {oneOf: [{type: 'number'}, {type: 'string'}]},
		until: {oneOf: [{type: 'number'}, {type: 'string'}]},
	},
});

/**
 *  Determines which handlers (if any) to apply
 *  @param {Object} options
 *  @return {Function|void} handler
 */

module.exports = options => {
	const {Model} = Options(options);
	const isHostServer = hostModel === Model.name;
	if (isHostServer === true) _scheduleCronJob(options);
};

/**
 *  Schedules a cron job
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _scheduleCronJob = Solution('connect to cronJobs Db for ${Model.name}.${methodName}', (scope, next) => {
	_connectToDb(scope, next);
});

Step('add cronJob for ${Model.name}.${methodName}', ({Model, methodName, logicalHandler, until, start, interval, collection}, next) => {
	const sleepUntil = new Date(start);
	const repeatUntil = new Date(until);
	const _id = `${Model.name}.${methodName}`;
	logicalHandlersById[_id] = logicalHandler;
	const $set = {interval, sleepUntil, repeatUntil};
	const opt = {upsert: true, returnNewDocument: true};
	collection.findOneAndUpdate({_id}, {$set}, opt, next);
});

Step('create cronJob runner', ({Model, collection, logicalHandler, ...scope}, next) => {
	if (worker) return;
	const onError = next;
	const onDocument = next;
	const autoRemove = true;
	const condition = {_id: {$regex:`^${Model.name}\\.`}};
	(worker = new MongoCron({onError, onDocument, condition, autoRemove, collection})).start();
});

Step('exec cronJob ${_id}', ({_id, ...scope}, next) => {
	const handler = logicalHandlersById[_id];
	if (typeof handler === 'function') handler(scope, next);
});

/**
 *  Connects to database
 *  @param {Object} [scope]
 *  @param {Function} [next]
 */

const _connectToDb = Solution('test cronJob Db connection', (scope, next) => {
	mongoClient.isConnected() ? next() : mongoClient.connect(next);
});

Step('get cronJob collection', ({Model}, next) => {
	next({collection: mongoClient.db().collection('cronJobs')});
});