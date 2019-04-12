'use strict';

const path = require('path');
const uuid = require('uuid');
const DbOp = require('ioModels/DbOp');
const {MongoClient} = require('mongodb');
const {JsonSchemaModel, Solution, Step, Catch, Reject} = require('conventions/core');

const indexes = [];
const dbOpHandlers = {};
const hostModel = path.basename(process.argv[1], '.js');
const specialCases = ['Event', 'EventResult', 'EventNotification'];
const mongoClient = new MongoClient(process.env.MKPLDB, {useNewUrlParser: true});

/**
 *  Options governing this handler's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'MongoOptions',
	required: [
		'Model',
		'dbOpName',
	],
	properties: {
		dbOpName: {type: 'string'},
		Model: {typeof: 'function'},
		collectionName: {type: 'string'},
	},
});

/**
 *  Determines which handlers (if any) to apply
 *  @param {Object} options
 *  @return {Function|void} handler
 */

module.exports = options => {
	const {Model, dbOpName} = Options(options);
	const isBrowser = typeof window === 'object';
	const isHostServer = hostModel === Model.name;
	if (isBrowser) return _noBrowserSupportForDbOps;
	if (isHostServer) return dbOpHandlers[dbOpName].bind(null, options);
	if (specialCases.includes(Model.name)) return dbOpHandlers[dbOpName].bind(null, options);
};

/**
 *  Indicates no browser support for Db ops
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _noBrowserSupportForDbOps = Solution('indicate lack of browser support for Db operations', (scope, next) => {
	next(Error('Cannot execute Db operations in browser'));
});

/**
 *  Finds documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

dbOpHandlers.index = Solution('validate DbOp "${dbOpName}" for ${Model.name}.${methodName}', (scope, next) => {
	next(DbOp(scope));
});

Step('connect DbOp Db for ${Model.name}.${methodName}', (scope, next) => {
	_connectToDb(scope, next);
});

Step('execute DbOp "${dbOpName}" for ${Model.name}.${methodName}', ({collection, uniqueBy, ...scope}, next) => {
	const indexObj = uniqueBy.reduce((a, k) => ({...a, [k]: 1}), {});
	collection.createIndex(indexObj, {background: true, unique: true}, next);
});

Step('execute logicalHandler for ${Model.name}.${methodName}', ({logicalHandler, ...scope}, next) => {
	logicalHandler(scope, next);
});

/**
 *  Finds documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

dbOpHandlers.find = Solution('validate DbOp "${dbOpName}" for ${Model.name}.${methodName}', (scope, next) => {
	next(DbOp(scope));
});

Step('connect DbOp Db for ${Model.name}.${methodName}', (scope, next) => {
	_connectToDb(scope, next);
});

Step('execute DbOp "${dbOpName}" for ${Model.name}.${methodName}', ({Model, collection, criteria, projection, sort, limit, skip}, next) => {
	collection.find(criteria, {projection, sort, limit, skip}).toArray(next);
});

Step('format DbOp "${dbOpName}" result for ${Model.name}.${methodName}', ({Model}, next, _, docs) => {
	next({[Model.pluralCamelCaseName]: docs.map(Model), resultCount: docs.length});
});

/**
 *  Inserts specified documents
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

dbOpHandlers.insert = Solution('validate DbOp "${dbOpName}" for ${Model.name}.${methodName}', (scope, next) => {
	next(DbOp(scope));
});

Step('connect DbOp Db for ${Model.name}.${methodName}', (scope, next) => {
	_connectToDb(scope, next);
});

Step('ensure that ${Model.camelCaseName}Id is set', ({Model, ...scope}, next) => {
	const prop = `${Model.camelCaseName}Id`;
	scope[prop] ? next() : next({[prop]: uuid()});
});

Step('execute DbOp "${dbOpName}" for ${Model.name}.${methodName}', ({Model, projection, collection, ...scope}, next) => {
	const upsert = true;
	const $set = Model(scope);
	const ids = Model.Ids(scope);
	const returnOriginal = false;
	collection.findOneAndUpdate(ids, {$set}, {returnOriginal, upsert}, next);
});

Catch('catch error in DbOp "${dbOpName}" for ${Model.name}.${methodName}', ({error, ...scope}, next) => {
	const {message, stack, codeName} = error;
	if (codeName !== 'DuplicateKey') return next(error);
	next(Object.assign(Object.create(Reject.prototype), {message, stack}, error));
});

Step('format DbOp "${dbOpName}" result for ${Model.name}.${methodName}', ({Model, value, ...scope}, next) => {
	value ? next({[Model.pluralCamelCaseName]: [Model(value)], resultCount: 1}) : next();
});

/**
 *  Updates documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 */

dbOpHandlers.update = Solution('validate DbOp "${dbOpName}" for ${Model.name}.${methodName}', (scope, next) => {
	next(DbOp(scope));
});

Step('connect DbOp Db for ${Model.name}.${methodName}', (scope, next) => {
	_connectToDb(scope, next);
});

Step('execute DbOp "${dbOpName}" for ${Model.name}.${methodName}', ({Model, collection, criteria, increment, ...scope}, next) => {
	const $inc = increment;
	const $set = Model(scope);
	collection.updateMany(criteria, {$set, $inc}, next);
});

Step('format DbOp "${dbOpName}" result for ${Model.name}.${methodName}', ({Model, value, ...scope}, next) => {
	value ? next({[Model.pluralCamelCaseName]: [Model(value)], resultCount: 1}) : next();
});

/**
 *  Removes documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 */

dbOpHandlers.remove = Solution('validate DbOp "${dbOpName}" for ${Model.name}.${methodName}', (scope, next) => {
	next(DbOp(scope));
});

Step('connect DbOp Db for ${Model.name}.${methodName}', (scope, next) => {
	_connectToDb(scope, next);
});

Step('execute DbOp "${dbOpName}" for ${Model.name}.${methodName}', ({collection, criteria}, next) => {
	collection.findOneAndDelete(criteria, next);
});

Step('format DbOp "${dbOpName}" result for ${Model.name}.${methodName}', ({Model, value, ...scope}, next) => {
	value ? next({[Model.pluralCamelCaseName]: [Model(value)], resultCount: 1}) : next();
});

/**
 *  Counts documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 */

dbOpHandlers.count = Solution('validate DbOp "${dbOpName}" for ${Model.name}.${methodName}', (scope, next) => {
	next(DbOp(scope));
});

Step('connect DbOp Db for ${Model.name}.${methodName}', (scope, next) => {
	_connectToDb(scope, next);
});

Step('execute DbOp "${dbOpName}" for ${Model.name}.${methodName}', ({collection, criteria, limit, skip}, next) => {
	collection.count(criteria, {limit, skip}, (err, resultCount) => next(err, {resultCount}));
});

/**
 *  Connects to database
 *  @param {Object} [scope]
 *  @param {Function} [next]
 */

const _connectToDb = Solution('test DbOp Db connection', (scope, next) => {
	mongoClient.isConnected() ? next() : mongoClient.connect(next);
});

Step('get DbOp "${Model.pluralCamelCaseName}" collection', ({Model, collectionName}, next) => {
	next({collection: mongoClient.db().collection(Model.pluralCamelCaseName)});
});