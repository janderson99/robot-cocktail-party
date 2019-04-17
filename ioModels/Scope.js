'use strict';

const qs = require('qs');
const uuid = require('uuid');
const get = require('keypather/get');
const set = require('keypather/set');
const DbOp = require('ioModels/DbOp');
const Extra = require('ioModels/Extra');
const Event = require('ioModels/Event');
const {Reject} = require('conventions/core');
const {createQuery} = require('odata-v4-mongodb');
const EventResult = require('ioModels/EventResult');
const EventNotification = require('ioModels/EventNotification');

/**
 *  De-nests properties from given HTTP request
 *  @param {Object} scope
 *  @param {Function} next
 *  @return {void}
 */

module.exports.flattenHttpRequest = ({Model, req}, next) => {
	const criteria = req.params;
	const extra = Extra(req.headers);
	const qString = req.originalUrl.split(/\?/)[1];
	const {eventName} = Event(get(req, 'body.events[0]'));
	const context = get(req, 'body.events[0].data.eventContext');
	const oString = get(req, 'body.events[0].data.transform.queryParameter');
	const query = _parseDbOp([qString, oString].filter(s => s).join('&'), {criteria});
	const model = Model(get(req, `body.events[0].data.transform.${Model.camelCaseName}`));
	next(_noEmptyProps({...model, ...query, ...criteria, ...context, extra, eventName}));
};

/**
 *  De-nests properties from given Event/EventResult/EventNotification
 *  @param {Object} event
 *  @param {Function} next
 *  @return {void}
 */

module.exports.flattenEventObj = ({Model, extra, eventId, eventName, statusCode, ...event}, next) => {
	const docs = get(event, 'data.output');
	const error = get(event, 'confirmMessage');
	const criteria = get(event, 'data.eventContext');
	const eventStatus = get(event, 'eventStatusCode.codeValue');
	const model = Model(get(event, `data.transform.${Model.camelCaseName}`));
	const query = _parseDbOp(get(event, 'data.transform.queryParameter'), {criteria});
	next(_noEmptyProps({...docs, ...model, ...query, ...criteria, ...error, extra, eventStatus, statusCode, eventId, eventName}));

};

/**
 *  Formulates a valid Event
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

module.exports.unflattenEvent = (scope, next) => {
	const event = _buildEvent(scope);
	next(_noEmptyProps(Event(event)));
};

/**
 *  Formulates a valid EventResult
 *  @param {Object} scope
 *  @param {Function} next
 *  @return {void}
 */

module.exports.unflattenEventResult = (scope, next) => {
	const event = _buildEvent(scope);
	next(_noEmptyProps(EventResult(event)));
};

/**
 *  Formulates a valid EventNotification
 *  @param {Object} scope
 *  @param {Function} next
 *  @return {void}
 */

module.exports.unflattenEventNotification = (scope, next) => {
	const event = _buildEvent(scope);
	next(_noEmptyProps(EventNotification(event)));
};

/**
 *  Formulates a valid Event/EventResult/EventNotification using properties from given Scope
 *  @param {Object} ...scope
 *  @param {Object} [event]
 *  @return {Object} event
 */

function _buildEvent({Model, ...scope}, event = {}) {
	set(event, 'eventStatusCode.codeValue', scope.eventStatus || 'completed');
	set(event, 'confirmMessage.developerMessage', scope.developerMessage);
	set(event, 'data.transform.queryParameter', _stringifyDbOp(scope));
	set(event, `data.transform.${Model.camelCaseName}`, Model(scope));
	set(event, 'confirmMessage.userMessage', scope.userMessage);
	set(event, 'eventNameCode.codeValue', scope.eventName);
	set(event, 'statusCode', scope.statusCode || 200);
	set(event, 'data.eventContext', Model.Ids(scope));
	set(event, 'eventId', scope.eventId || uuid());
	set(event, 'extra', Extra(scope.extra));
	set(event, 'data.output', scope);
	return event;
}

/**
 *  Prunes falsy values and empty arrays/objects
 *  @param {Object} obj
 *  @return {Object} prunedObj
 */

const _noEmptyProps = ({...obj}) => {
	_deleteFalsyEmptyAndDefaultProperties(obj);
	return obj;
};

const _deleteFalsyEmptyAndDefaultProperties = obj => Object.keys(obj).forEach(key => {
	if (!obj[key]) return delete obj[key];
	const type = Object(obj[key]).constructor.name;
	if (!{Object: true, Array: true}[type]) return;
	_deleteFalsyEmptyAndDefaultProperties(obj[key]);
	for (var hasAtLeastOneProperty in obj[key]) break;
	if (!Array.isArray(obj) && !hasAtLeastOneProperty) delete obj[key];
});

/**
 *  Convert querystring to dbOp
 *  @param {String} string
 *  @param {Object} dbOp
 *  @return {Object} dbOp
 */

function _parseDbOp(string = '', {...dbOp} = {}) {
	// ignore unnecessary characters and whitespace
	string = string.split(/\?/).pop() || '';
	if (!string.trim()) return DbOp(dbOp);

	// merge query into dbOp
	const query = qs.parse(string, qsOpt);
	dbOp.sort = {...dbOp.sort, ...query.sort};
	if (!isNaN(query.skip)) dbOp.skip = query.skip;
	if (!isNaN(query.limit)) dbOp.limit = query.limit;
	dbOp.criteria = {...dbOp.criteria, ...query.criteria};
	dbOp.projection = {...dbOp.projection, ...query.projection};

	// bail if no OData
	const {$filter, $select, $skip, $top} = query;
	if (!$filter && !$select && !$skip && !$top) return DbOp(dbOp);

	// merge OData into dbOp
	try { var oData = createQuery(string); } catch (e) { throw Reject(`couldn't parse OData: ${e.message}`); }
	dbOp.projection = {...dbOp.projection, ...oData.projection};
	dbOp.criteria = {...dbOp.criteria, ...oData.query};
	if (!isNaN(oData.limit)) dbOp.limit = oData.limit;
	if (!isNaN(oData.skip)) dbOp.skip = oData.skip;
	dbOp.sort = {...dbOp.sort, ...oData.sort};

	// return props
	return DbOp(dbOp);
}

/**
 *  Convert dbOp to querystring
 *  @param {Object} dbOp
 *  @return {String} querystring
 */

function _stringifyDbOp(dbOp) {
	return qs.stringify(DbOp(dbOp), qsOpt);
}

const qsOpt = {
	encode: false,
	allowDots: true,
	filter: (k, v) => v instanceof RegExp ? {$regex: `${v}`.slice(1, -3), $options: 'i'} : v,
};
