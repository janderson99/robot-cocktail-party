'use strict';

const path = require('path');
const uuid = require('uuid');
const DbOp = require('ioModels/DbOp');
const {MongoClient} = require('mongodb');
const {getStatefulCache} = require('conventions/statefulCache');
const {JsonSchemaModel, Solution, Step, Catch, Reject} = require('conventions/core');

const dbOpHandlers = {};
const hostModel = path.basename(process.argv[1], '.js');
const ioModels = ['Event', 'EventResult', 'EventNotification'];

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
	const isIoModel = ioModels.includes(Model.name);
	if (!isBrowser && isIoModel) return dbOpHandlers[dbOpName].bind(null, options);
	if (!isBrowser && isHostServer) return dbOpHandlers[dbOpName].bind(null, options);
	if (isBrowser || !isIoModel && !isHostServer) return _indicateSupport.bind(null, options);
};

/**
 *  Indicates no support for Db op
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _indicateSupport = Solution('indicate support for ${Model.name}.${methodName}', ({Model, methodName}, next) => {
	next(Error(`${Model.name}.${methodName} cannot be used by browsers, or non-host servers`));
});

/**
 *  Finds documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

dbOpHandlers.index = Solution('connect to Db for \'${dbOpName}\' DbOp for ${Model.name}.${methodName}', (scope, next) => {
	_connect({...DbOp(scope), ...Options(scope)}, next);
});

Step('execute DbOp', ({collection, uniqueBy, ...scope}, next) => {
	const indexObj = uniqueBy.reduce((a, k) => ({...a, [k]: 1}), {});
	collection.createIndex(indexObj, {background: true, unique: true}, next);
});

Step('execute logicalHandler', ({logicalHandler, ...scope}, next) => {
	logicalHandler(scope, next);
});

/**
 *  Finds documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

dbOpHandlers.find = Solution('connect to Db for \'${dbOpName}\' DbOp for ${Model.name}.${methodName}', (scope, next) => {
	_connect({...DbOp(scope), ...Options(scope)}, next);
});

Step('execute DbOp', ({Model, collection, criteria, projection, sort, limit, skip}, next) => {
	collection.find(criteria, {projection, sort, limit, skip}).toArray(next);
});

Step('format DbOp result', ({Model}, next, _, docs) => {
	next({[Model.pluralCamelCaseName]: docs.map(Model)});
});

/**
 *  Inserts specified documents
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

dbOpHandlers.insert = Solution('connect to Db for \'${dbOpName}\' DbOp for ${Model.name}.${methodName}', (scope, next) => {
	_connect({...DbOp(scope), ...Options(scope)}, next);
});

Step('execute DbOp', ({Model, projection, collection, ...scope}, next) => {
	const upsert = true;
	const returnOriginal = false;
	const ids = Model.Ids(scope);
	for (var hasId in ids) break;
	const opt = {$set: Model(scope)};
	if (!hasId) Object.assign(ids, opt.$set);
	if (!hasId) opt.$setOnInsert = {[`${Model.camelCaseName}Id`]: uuid()};
	collection.findOneAndUpdate(ids, opt, {returnOriginal, upsert, projection}, next);
});

Catch('catch error', ({error, ...scope}, next) => {
	const {message, stack, codeName} = error;
	if (codeName !== 'DuplicateKey') return next(error);
	next(Object.assign(Object.create(Reject.prototype), {message, stack}, error));
});

Step('format DbOp result', ({Model, value, ...scope}, next) => {
	value ? next({[Model.pluralCamelCaseName]: [Model(value)]}) : next();
});

/**
 *  Updates documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 */

dbOpHandlers.update = Solution('connect to Db for \'${dbOpName}\' DbOp for ${Model.name}.${methodName}', (scope, next) => {
	_connect({...DbOp(scope), ...Options(scope)}, next);
});

Step('execute DbOp', ({Model, criteria, projection, increment, collection, upsert, ...scope}, next) => {
	const opt = {};
	const doc = Model(scope);
	const returnOriginal = false;
	if (Object.keys(doc).length) opt.$set = doc;
	if (Object.keys(Object(increment)).length) opt.$inc = increment;
	collection.findOneAndUpdate(criteria, opt, {returnOriginal, upsert, projection}, next);
});

Catch('catch error', ({error, ...scope}, next) => {
	const {message, stack, codeName} = error;
	if (codeName !== 'DuplicateKey') return next(error);
	next(Object.assign(Object.create(Reject.prototype), {message, stack}, error));
});

Step('format DbOp result', ({Model, value, ...scope}, next) => {
	value ? next({[Model.pluralCamelCaseName]: [Model(value)]}) : next();
});

/**
 *  Removes documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 */

dbOpHandlers.remove = Solution('connect to Db for \'${dbOpName}\' DbOp for ${Model.name}.${methodName}', (scope, next) => {
	_connect({...DbOp(scope), ...Options(scope)}, next);
});

Step('execute DbOp', ({collection, criteria}, next) => {
	collection.findOneAndDelete(criteria, next);
});

Step('format DbOp result', ({Model, value, ...scope}, next) => {
	value ? next({[Model.pluralCamelCaseName]: [Model(value)]}) : next();
});

/**
 *  Counts documents matching the specified criteria
 *  @param {Object} [scope]
 *  @param {Function} [next]
 */

dbOpHandlers.count = Solution('connect to Db for \'${dbOpName}\' DbOp for ${Model.name}.${methodName}', (scope, next) => {
	_connect({...DbOp(scope), ...Options(scope)}, next);
});

Step('execute DbOp', ({Model, collection, criteria, limit, skip}, next) => {
	collection.countDocuments(criteria, {limit, skip}, (err, count) => next(err, {[Model.pluralCamelCaseName]: count}));
});

/**
 *  Handles connection establishment
 *  @param {Object} opt
 *  @param {Function} [next]
 *  @param {Error} [error]
 *  @return {*|void}
 */

const _connect = (opt, next, error) => {
	const {Model, collectionName = Model.pluralCamelCaseName} = opt;
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

	// retrieve collection, or await collection
	const [_awaitCollection, _setCollection, collection] = getStatefulCache(`collection=${collectionName}`, client);
	if (_setCollection) _setCollection(null, client.db().collection(collectionName));
	if (_awaitCollection) return _awaitCollection(_retry);

	// indicate success
	next({collection});
};
