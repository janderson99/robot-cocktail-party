'use strict';

const path = require('path');
const Agenda = require('agenda');
const hostModel = path.basename(process.argv[1], '.js');
const {JsonSchemaModel, Solution, Step} = require('conventions/core');
const agenda = new Agenda({db: {address: process.env.MKPLDB, collection: 'cronJobs'}});

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
		every: {type: 'string'},
		when: {type: 'string'},
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

const _scheduleNewCronJob = Solution('start cronJob client for ${Model.name}.${methodName}', ({Model, logicalHandler, methodName, when, every}, next) => {
	const name = `${Model.name}.${methodName}:${when || every}`;
	const _next = next.bind(null, {name});
	agenda.define(name, logicalHandler);
	agenda.start().then(_next, _next);
});


Step('schedule cronJob for ${Model.name}.${methodName}', ({Model, name, every, when}, next) => {
	const job = agenda.create(name);
	if (when) job.schedule(when, [name]).unique({name}).save().then(next, next);
	if (every) job.repeatEvery(every, [name]).unique({name}).save().then(next, next);
});