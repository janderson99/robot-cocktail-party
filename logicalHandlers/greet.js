'use strict';

const Greeting = require('logicalModels/Greeting');
const {JsonSchemaModel, Solution, Step} = require('conventions/core');

/**
 *  Options governing this handler's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'GreetOptions',
	required: [
		'Model',
		'Greetee',
	],
	properties: {
		Model: {typeof: 'function'},
		Greetee: {typeof: 'function'},
	},
});

/**
 * Records a greeting between the given greeter and greetee
 * @param {Object} [scope]
 * @param {Function} [next]
 */

module.exports = Solution('parse options',  (scope, next) => {
	next({...Options(scope), ...Greeting(scope)});
});

Step('verify greeter IDs',  ({Model, greeterId}, next) => {
	Model.verifyIds({[Model.camelCaseName + 'Id']: greeterId}, next);
});

Step('verify greetee IDs',  ({Greetee, greeteeId}, next) => {
	Greetee.verifyIds({[Greetee.camelCaseName + 'Id']: greeteeId}, next);
});

Step('insert Greeting',  ({Model, Greetee, ...scope}, next) => {
	scope.criteria = Model.Ids(scope);
	scope.greeterType = Model.camelCaseName;
	scope.greeteeType = Greetee.camelCaseName;
	Greeting.insert({...scope, upsert: true}, next);
});