'use strict';

const {JsonSchemaModel, Solution, Step} = require('conventions/core');

/**
 *  Options governing this handler's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'GiveOptions',
	required: [
		'Model',
		'producerId',
		'receiverId',
		'receiverType',
		'producedType',
	],
	properties: {
		Model: {typeof: 'function'},
		producerId: {type: 'string'},
		receiverId: {type: 'string'},
		producerType: {type: 'string'},
		receiverType: {type: 'string'},
		producedType: {type: 'string'},
	},
});

/**
 *  Creates an instance of a given `Thing`
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

module.exports = Solution('validate GiveOptions', ({Model, ...scope}, next) => {
	next(Options({Model, ...scope, producerType: Model.name}));
});

Step('verify that producerId matches existing ${Model.name}', ({Model, producerId, ...scope}, next) => {
	Model.verifyIds({...scope, [`${Model.camelCaseName}Id`]: producerId}, next);
});

Step('verify that receiverId matches existing ${receiverType}', ({receiverType, receiverId, ...scope}, next) => {
	const Receiver = require(`logicalModels/${receiverType}`);
	Receiver.verifyIds({...scope, [`${Receiver.camelCaseName}Id`]: receiverId}, next);
});

Step('give ${producedType} from ${Model.name} to ${receiverType}', ({producedType, ...scope}, next) => {
	const Produced = require(`logicalModels/${producedType}`);
	Produced.insert(scope, next);
});