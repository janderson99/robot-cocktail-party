'use strict';

const os = require('os');
const path = require('path');
const MqMsg = require('ioModels/MqMsg');
const Event = require('ioModels/Event');
const Scope = require('ioModels/Scope');
const amq = require('amqplib/callback_api');
const EventResult = require('ioModels/EventResult');
const EventNotification = require('ioModels/EventNotification');
const {JsonSchemaModel, Solution, Step, Catch, Reject} = require('conventions/core');

const eventHandlers = {};
const notifHandlers = {};
const resultHandlers = {};
const dynamicMethods = {};
const connectionHandlers = [];
const hostname = os.hostname();
const hostModel = path.basename(process.argv[1], '.js');
const urls = String(process.env.AMQP_POOL || '').split(',');
const appInstanceId = `${hostname}:${process.env.NODE_UNIQUE_ID || 0}`;

/**
 *  Options governing this solution's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'MqOptions',
	required: [
		'Model',
		'eventName',
	],
	properties: {
		Model: {typeof: 'function'},
		eventName: {type: 'string'},
		notifName: {type: 'string'},
	},
});

/**
 *  Determines which handlers (if any) to apply
 *  @param {Object} options
 *  @return {Function|void}
 */

module.exports = options => {
	const {Model} = Options(options);
	const isBrowser = typeof window === 'object';
	const isHostServer = hostModel === Model.name;
	if (isHostServer && options.eventName) _awaitInboundEvent(options);
	if (isHostServer && options.notifName) _awaitInboundNotif(options);
	if (!isBrowser && options.eventName) return _awaitOutboundEvent(options);
};

/**
 *  Listens for inbound EventNotifications
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _awaitInboundNotif = Solution('await inbound MQ EventNotification for ${notifName}', ({notifName, ...scope}, next) => {
	notifHandlers[notifName] = next;
	_connect({notifName, ...scope});
});

Step('find EventNotification for ${notifName}', ({eventId, ...scope}, next) => {
	Event.find({...scope, criteria: {eventId}}, next);
});

Step('parse EventNotification for ${notifName}', ({eventNotifications, eventId, ...scope}, next) => {
	if (!eventNotifications[0]) return next(Error(`Event not found for eventId ${eventId}`));
	Scope.unflattenEventNotification({...scope, ...eventNotifications[0]}, next);
});

Step('save Event for ${eventName}', ({...scope}, next) => {
	Event.insert(scope, next);
});

Step('send Event for ${eventName}', ({Model, eventName, ...scope}, next) => {
	const replyTo = `${Model.camelCaseName}ManagerEventResults.${appInstanceId}`;
	const json = JSON.stringify(MqMsg({eventName, ...scope}));
	dynamicMethods.sendEvent(eventName, new Buffer(json), {replyTo}, next);
});

Step('ack EventNotification for ${notifName}', (scope, next) => {
	dynamicMethods.ackNotif(scope);
	next();
});

/**
 *  Listens for inbound Events
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _awaitInboundEvent = Solution('await inbound MQ Events for ${eventName}', ({eventName, ...scope}, next) => {
	eventHandlers[eventName] = next;
	_connect({...scope, eventName});
});

Step('find Event for ${eventName}', ({eventId, ...scope}, next) => {
	Event.find({eventId, ...scope, criteria: {eventId}}, next);
});

Step('ensure Event for ${eventName}', ({events, ...scope}, next) => {
	events[0] ? next(events[0]) : dynamicMethods.nackEvent(scope);
});

Step('parse Event for ${eventName}', ({events, ...scope}, next) => {
	Scope.flattenEventObj({...scope, ...events[0]}, next);
});

Catch('catch error', ({error, ...scope}) => {
	console.log(error.stack);
	dynamicMethods.nackEvent(scope);
});

Step('execute logic for ${eventName}', ({Model, logicalHandler, ...scope}, next) => {
	logicalHandler(scope, next);
});

Catch('catch error for ${eventName}', ({error, ...scope}, next) => {
	console.log(error.stack);
	const userMessage = error.message;
	const developerMessage = error.stack;
	const isReject = error instanceof Reject;
	const statusCode = isReject ? 400 : 500;
	const eventStatus = isReject ? 'completed' : 'failed';
	next({userMessage, developerMessage, statusCode, eventStatus});
});

Step('build EventResult for ${eventName}', (scope, next) => {
	Scope.unflattenEventResult(scope, next);
});

Step('save EventResult for ${eventName}', (scope, next) => {
	EventResult.insert(scope, next);
});

Step('send EventResult for ${eventName}', ({replyTo, ...scope}, next) => {
	const json = JSON.stringify(MqMsg(scope));
	dynamicMethods.sendResult(replyTo, new Buffer(json), {}, next);
});

Step('save EventNotification for ${eventName}', ({...scope}, next) => {
	EventNotification.insert(scope, next);
});

Step('send EventNotification for ${eventName}', ({eventName, ...scope}, next) => {
	const json = JSON.stringify(MqMsg({eventName, ...scope}));
	dynamicMethods.sendNotif(eventName, new Buffer(json), {}, next);
});

Step('ack Event for ${eventName}', (scope, next) => {
	dynamicMethods.ackEvent(scope);
	next(EventResult(scope));
});

/**
 *  Handles sending outbound Events
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _awaitOutboundEvent = Solution('await outbound MQ Event "${eventName}"', (scope, next) => {
	return next;
});

Step('format Event for ${eventName}', (scope, next) => {
	Scope.unflattenEvent(scope, next);
});

Step('save Event for ${eventName}', (scope, next) => {
	Event.insert(scope, next);
});

Step('establish channel for ${eventName}', ({eventId, ...scope}, next) => {
	connectionHandlers.push(next);
	_connect({eventId, ...scope});
});

Step('send Event for ${eventName}', ({Model, eventId, eventName, ...scope}, next) => {
	resultHandlers[eventId] = next;
	const json = JSON.stringify(MqMsg({eventName, eventId, ...scope}));
	const replyTo = `${Model.camelCaseName}ManagerEventResults.${appInstanceId}`;
	dynamicMethods.sendEvent(eventName, new Buffer(json), {replyTo}, error => error && next(error));
});

Step('find EventResult for ${eventName}', ({eventId, ...scope}, next) => {
	EventResult.find({...scope, criteria: {eventId}}, next);
});

Step('parse EventResult for ${eventName}', ({eventResults, eventId, ...scope}, next) => {
	if (!eventResults[0]) return next(Error(`EventResult not found for eventId ${eventId}`));
	Scope.flattenEventObj({...scope, ...eventResults[0]}, next);
});

Step('ack EventResult for ${eventName}', (scope, next, parsedEventObj) => {
	dynamicMethods.ackResult(scope);
	next(parsedEventObj);
});

/**
 *  Handles connection establishment
 *  @param {Object} opts
 *  @param {Error} [error]
 *  @return {*|void}
 */

const _connect = (opts, error) => _connectionOpts(opts).every((opt, index, options) => {
	const {onInbound, routingKey, exchangeName, queueName, methodSuffix} = opt;
	const isLastOption = index + 1 === options.length;
	const _retry = _connect.bind(null, opts);

	// delay if we've had an error
	if (error) return void setTimeout(_retry, 2000);

	// retrieve established connection, or await establishment
	const [_awaitConnection, _setConnection, connection, _delConnection] = _getState('conn=mq', global);
	if (_setConnection) amq.connect(_getUrlFromPool(), _setConnection);
	if (_awaitConnection) return void _awaitConnection(_retry);

	// add error handlers if not already added
	if (!connection.hasListeners) connection.on('close', _retry).on('error', _delConnection);
	connection.hasListeners = true;

	// retrieve established event channel, or await establishment
	const [_awaitChannel, _setChannel, channel, _delChannel] = _getState(`ch=${exchangeName}`, connection);
	if (_setChannel) connection.createConfirmChannel(_setChannel);
	if (_awaitChannel) return void _awaitChannel(_retry);

	// add error handlers if not already added
	if (!channel.hasListeners) channel.on('close', _retry).on('error', _delChannel);
	channel.hasListeners = true;

	// add methods
	const ack = ({mqMsg}) => channel.ack(mqMsg);
	dynamicMethods[`ack${methodSuffix}`] = ({mqMsg}) => channel.ack(mqMsg);
	dynamicMethods[`nack${methodSuffix}`] = ({mqMsg}) => channel.nack(mqMsg);
	dynamicMethods[`send${methodSuffix}`] = (...a) => channel.publish(exchangeName, ...a);

	// confirm that inbound exchange is established, or await establishment
	const [_awaitExchange, _setExchange] = _getState(`ex=${exchangeName}`, channel);
	if (_setExchange) channel.assertExchange(exchangeName, 'topic', {}, _setExchange);
	if (_awaitExchange) return void _awaitExchange(_retry);

	// confirm that event queue is established, or await establishment
	const [_awaitQueue, _setQueue] = _getState(`q=${queueName}`, channel);
	if (_setQueue) channel.assertQueue(queueName, {}, _setQueue);
	if (_awaitQueue) return void _awaitQueue(_retry);

	// skip routing if we don't have routing key
	if (!routingKey) return true;

	// confirm that event topic is routed, or await routing
	const [_awaitRoute, _setRoute] = _getState(`routingKey=${routingKey}`, channel);
	if (_setRoute) channel.bindQueue(queueName, exchangeName, routingKey, {}, _setRoute);
	if (_awaitRoute) return void _awaitRoute(_retry);

	// confirm that listener is established, or await establishment
	const [_awaitEventListener, _setEventListener] = _getState(`listener=${exchangeName}`, channel);
	if (_setEventListener) channel.consume(queueName, onInbound.bind(null, {ack}), {}, _setEventListener);
	if (_awaitEventListener) return void _awaitEventListener(_retry);

	// indicate success
	if (!isLastOption) return true;
	connectionHandlers.splice(0).forEach(f => f());
});

const _connectionOpts = ({Model, eventName, notifName, ...scope}) => [{
	methodSuffix: 'Result',
	exchangeName: 'event_results',
	queueName: `${Model.camelCaseName}ManagerEventResults.${appInstanceId}`,
	routingKey: `${Model.camelCaseName}ManagerEventResults.${appInstanceId}`,
	onInbound: _onInbound.bind(null, {...scope, handlers: resultHandlers, key: 'eventId'}),
}, {
	routingKey: notifName,
	methodSuffix: 'Notif',
	exchangeName: 'event_notifications',
	queueName: `${Model.camelCaseName}ManagerEventNotifications`,
	onInbound: _onInbound.bind(null, {...scope, handlers: notifHandlers, key: 'eventName'}),
}, {
	routingKey: eventName,
	methodSuffix: 'Event',
	exchangeName: 'events',
	queueName: `${Model.camelCaseName}ManagerEvents`,
	onInbound: _onInbound.bind(null, {...scope, handlers: eventHandlers, key: 'eventName'}),
}];

const _getUrlFromPool = () => {
	urls.push(urls.shift());
	return urls[0] || process.env.AMQP;
};

const _delState = (obj, key) => error => {
	obj[key] = null;
	if (error) console.log(error.stack);
};

const _setState = (obj, key, oldState) => (error, newState) => {
	obj[key] = newState;
	if (error) console.log(error.stack);
	oldState.map(f => process.nextTick(() => f(error)));
};

const _getState = (key, cache) => {
	const state = cache[key] = cache[key] == null ? [] : cache[key];
	const _set = state.length === 0 && _setState(cache, key, state);
	const _delete = !Array.isArray(state) && _delState(cache, key);
	const _await = Array.isArray(state) && (cb => state.push(cb));
	const value = !Array.isArray(state) && state;
	return [_await, _set, value, _delete];
};

const _onInbound = Solution('parse MqMsg', ({fields, properties, content, headers}, next) => {
	const parsed = MqMsg(JSON.parse(content.toString()));
	next({mqMsg: {fields}, ...properties, ...parsed});
});

Step('execute MqMsg handler', ({handlers, key, ...scope}, next, parsed) => {
	const mqMsgHandler = handlers[scope[key]];
	if (!mqMsgHandler) throw Error('bad msg');
	delete handlers[scope.eventId];
	mqMsgHandler(parsed);
});

Catch('catch error', ({error, ack, ...scope}) => {
	console.log(error.stack);
	ack(scope);
});


