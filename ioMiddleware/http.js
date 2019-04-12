'use strict';

const path = require('path');
const {parse} = require('url');
const express = require('express');
const request = require('request');
const Extra = require('ioModels/Extra');
const Scope = require('ioModels/Scope');
const bodyParser = require('body-parser');
const {default: Path} = require('path-parser');
const {JsonSchemaModel, Solution, Step, Catch, Reject} = require('conventions/core');

const appByPort = {};
const serverByPort = {};
const hostModel = path.basename(process.argv[1], '.js');

/**
 *  Options governing this handler's behavior
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

const Options = JsonSchemaModel({
	$id: 'HttpOptions',
	required: [
		'uri',
		'Model',
		'method',
	],
	properties: {
		Model: {typeof: 'function'},
		uri: {type: 'string', default: '/'},
		method: {type: 'string', enum: ['GET', 'PUT', 'POST', 'HEAD', 'PATCH', 'OPTION', 'DELETE']},
	},
});

/**
 *  Determines which handlers (if any) to apply
 *  @param {Object} options
 *  @return {Function|void} handler
 */

module.exports = options => {
	const {Model} = Options(options);
	const isBrowser = typeof window === 'object';
	const isHostServer = hostModel === Model.name;
	if (isHostServer) _awaitInboundRequests(options);
	if (isBrowser) return _awaitOutboundRequests(options);
};

/**
 *  Awaits outbound HTTP requests
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {Function} handler
 */

const _awaitOutboundRequests = Solution('await outbound requests to ${method} ${uri}', ({method, pathname}, next) => {
	const _routeBuilder = Path.prototype.build.bind(pathname);
	return next.bind(null, {_routeBuilder});
});

Step('send request to ${method}${uri}', ({_routeBuilder, extra, method, ...body}, next) => {
	const headers = Extra(extra);
	const url = _routeBuilder(body);
	request({method, url, headers, body}, next);
});

/**
 *  Awaits inbound HTTP requests
 *  @param {Object} [scope]
 *  @param {Function} [next]
 *  @return {void}
 */

const _awaitInboundRequests = Solution('await inbound HTTP requests to ${method} ${uri}', ({method, uri}, next) => {
	const {port, ...url} = parse(uri);
	const route = uri.split(url.host).pop();
	appByPort[port] = appByPort[port] || express().use(bodyParser.json());
	serverByPort[port] = serverByPort[port] || appByPort[port].listen(port);
	appByPort[port][method.toLowerCase()](route, (req, res) => next({req, res, route, port, ...url}));
});

Catch('catch error from awaiting inbound HTTP requests to ${method} ${uri}', ({error}) => {
	console.log(error.stack);
});

Step('parse HTTP request for ${method} ${uri}', (scope, next) => {
	Scope.flattenHttpRequest(scope, next);
});


Step('execute logic for ${method} ${uri}', ({Model, logicalHandler, ...scope}, next) => {
	logicalHandler(scope, next);
});

Catch('catch error from logic for ${method} ${uri}', ({error}, next) => {
	console.log(error.stack);
	const userMessage = error.message;
	const developerMessage = error.stack;
	const isReject = error instanceof Reject;
	const statusCode = isReject ? 400 : 500;
	const eventStatus = isReject ? 'completed' : 'failed';
	next({statusCode, developerMessage, userMessage, eventStatus});
});

Step('format response for ${method} ${uri}', (scope, next) => {
	Scope.unflattenEventResult(scope, next);
});

Step('send response for ${method} ${uri}', ({res}, next, prunedProps) => {
	res.json({...prunedProps, extra: undefined});
});