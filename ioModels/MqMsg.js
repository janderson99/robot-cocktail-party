'use strict';

const {JsonSchemaModel} = require('conventions/core');

/**
 *  Represents a message sent via MQ
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'MqMsg',
	required: [
		'eventId'
	],
	properties: {
		replyTo: {type: 'string'},
		eventName: {type: 'string'},
		notifName: {type: 'string'},
		eventId: {type: 'string', format: 'uuid'},
	},
});