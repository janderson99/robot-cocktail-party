'use strict';

const path = require('path');
const Agenda = require('agenda');
const hostModel = path.basename(process.argv[1], '.js');
const {getStatefulCache} = require('conventions/statefulCache');
const {JsonSchemaModel, Solution, Step} = require('conventions/core');
const {MongoClient} = require('mongodb');

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
	],
	properties: {
		once: {type: 'string'},
		every: {type: 'string'},
		Model: {typeof: 'function'},
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
	if (isHostServer) _scheduleNewCronJob(options);
};

/**
 *  Schedules a cron job
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _scheduleNewCronJob = Solution('connect cronJob client for ${Model.name}.${methodName}', (scope, next) => {
	_connect(scope, next);
});

Step('start cronJob client for ${Model.name}.${methodName}', ({Model, agenda, logicalHandler, methodName, once, every, ...scope}, next) => {
	const name = `${Model.name}.${methodName}:${once || every}`;
	agenda.define(name, logicalHandler.bind(null, scope));
	const _next = next.bind(null, {name});
	agenda.start().then(_next, _next);
});

Step('schedule cronJob for ${Model.name}.${methodName}', ({Model, agenda, name, every, once}, next) => {
	let job = agenda.create(name);
	if (once) job = job.schedule(once, [name]);
	if (every) job = job.repeatEvery(every, [name]);
	job.unique({name}, {}).save().then(next, next);
});

/**
 *  Handles connection establishment
 *  @param {Object} opt
 *  @param {Function} [next]
 *  @param {Error} [error]
 *  @return {*|void}
 */

const _connect = (opt, next, error) => {
	const {collectionName = 'cronJobs'} = opt;
	const _retry = _connect.bind(null, opt, next);

	// delay if we've had an error
	if (error) return setTimeout(_retry, 2000);

	// retrieve established connection, or await establishment
	const [_awaitClient, _setClient, client, _delClient] = getStatefulCache('conn=mongo', global);
	if (_setClient) MongoClient.connect(process.env.MKPLDB, {useNewUrlParser: true}, _setClient);
	if (_awaitClient) return _awaitClient(_retry);

	// add error handlers if not already added
	if (!client.hasListeners) client.db().on('close', _retry).on('error', _delClient);
	client.hasListeners = true;

	// retrieve established agenda, or await establishment
	const [_awaitAgenda, _setAgenda, agenda] = getStatefulCache('collection=cronJobs', client);
	if (_setAgenda) _setAgenda(null, new Agenda({mongo: client.db(), db: {collection: collectionName}}));
	if (_awaitAgenda) return _awaitAgenda(_retry);

	// indicate success
	next({agenda});
};
