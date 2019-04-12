'use strict';

const {JsonSchemaModel} = require('conventions/core');

/**
 *  Represents data to be inherited by each event
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'Extra',
	properties: {
		orgoid: {type: 'string'},
		associateoid: {type: 'string'},
		sm_transactionid: {type: 'string'},
		sm_serversessionid: {type: 'string'},
	},
});