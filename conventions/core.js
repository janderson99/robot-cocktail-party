'use strict';

let solution;
let _logWatcher;
const logIndent = 4;
let lastScopeId = 0;
let lastLoggedScopeId = 0;
const logLeftSideSize = 5;
const Ajv = require('ajv');
const chalk = require('chalk');
const get = require('keypather/get');
const addAjvKeywords = require('ajv-keywords');
const {camelize, pluralize, classify, underscore} = require('inflection');
const isProd = String(process.env.NODE_ENV).toLowerCase().startsWith('prod');

const ajv = new Ajv({
	$data: true,
	useDefaults: true,
	missingRefs: 'ignore',
	removeAdditional: 'all',
});

addAjvKeywords(ajv, [
	'range',
	'regexp',
	'typeof',
	'allRequired',
	'anyRequired',
	'formatMinimum',
	'formatMaximum',
	'dynamicDefaults',
]);

module.exports.onUniqueIndexer = validate =>
	ajv.addKeyword('unique', {validate});

/**
 *  Error indicating validation failure
 *  @param {String} message
 *  @return {Reject}
 */

module.exports.Reject =
	Object.assign(Reject, {prototype: Object.create(Error.prototype)});

const patternToToRemoveFromStack =
	new RegExp(`(\\n.+${__dirname.replace(/(\W)/g, '\\$1')}.+)+`, 'g');

function Reject(message) {
	var {stack, message} = new Error(...arguments);
	stack = stack.replace(patternToToRemoveFromStack, '');
	return Object.assign(Object.create(Reject.prototype), {message, stack});
}

/**
 *  Creates a new solution
 *  @param {String} desc
 *  @param {Function} func
 *  @return {Function} solution
 */

module.exports.Solution = (desc, func) => {
	solution = {};
	solution.desc = [desc];
	solution.func = [func];
	solution.type = ['step'];
	const onDone = error => error && console.log(error.stack);
	return _wrapClosureAroundNextStep(solution, -1, onDone);
};

const _wrapClosureAroundNextStep = (prev, prevIndex, _onDone) => (...arg) => {
	let {type, func, desc, methodOpts, scopeDepth = -1, scopeId = ++lastScopeId} = prev;
	const error = arg.find((a, i) => a instanceof Error && arg.splice(i, 1));
	const given = Object.assign({scopeDepth}, ...arg);

	// transfer scope
	const isFirstStep = prevIndex === -1;
	if (isFirstStep) scopeDepth = given.scopeDepth + 1;
	if (isFirstStep) methodOpts = arg.find(a => a.Model);
	const scopeParentId = isFirstStep ? given.scopeId : scopeId;
	if (isFirstStep && style(scopeId) === style(given.scopeId)) scopeId = ++lastScopeId;
	if (isFirstStep && style(scopeId) === style(lastLoggedScopeId)) scopeId = ++lastScopeId;
	const scope = {...prev, ...given, ...methodOpts, methodOpts, type, func, desc, error, scopeDepth, scopeId, scopeParentId};

	// determine next step
	if (isFirstStep) _onDone = arg.find(o => typeof o === 'function') || _onDone;
	const index = type.indexOf(error ? 'catch' : 'step', prevIndex + 1);
	const nextStep = _wrapClosureAroundNextStep(scope, index, _onDone);

	// handle errors
	if (error && type[prevIndex] === 'step') error.message = `couldn't ${_desc(scope, prevIndex)} : ${error.message}`;
	if (typeof func[index] !== 'function') return void _onDone(error, ...arg, {scopeDepth, scopeId});

	// execute step function
	if (!isProd) _log(type[index], given, scope, _desc(scope, index));
	try { return func[index](scope, nextStep, ...arg); } catch (e) { return nextStep(error || e, ...arg); }
};

const _desc = ({desc, ...scope}, n) =>
	desc[n].replace(/\${(.+?)}/g, (_, k) => get(scope, k));

const _log = (type, given, scope, description) => {
	// determine arrow
	const isUninterruptedSequence = {[given.scopeId]: true, [scope.scopeId]: true}[lastLoggedScopeId];
	if (scope.scopeDepth === given.scopeDepth) var arrow = '↑'.padStart(scope.scopeDepth * logIndent);
	if (scope.scopeDepth < given.scopeDepth) arrow = '↗'.padStart(scope.scopeDepth * logIndent);
	if (scope.scopeDepth > given.scopeDepth) arrow = '↖'.padStart(scope.scopeDepth * logIndent);
	if (!isUninterruptedSequence) arrow = '←'.padEnd(scope.scopeDepth * logIndent, '─');
	if (!scope.scopeParentId) arrow = '→'.padStart(scope.scopeDepth * logIndent);
	lastLoggedScopeId = scope.scopeId;

	// write log
	if (type === 'catch') description = chalk.redBright(description);
	try { description += ` (${_logWatcher(scope)})`; } catch (ignored) { /* do nothing */ }
	const id = String(isUninterruptedSequence && scope.scopeId || given.scopeId || scope.scopeId);
	_writeLog(`${style(id)(id.padStart(logLeftSideSize))} ${style(scope.scopeId)(arrow)} ${description}\n`);
};

const colors = [
	chalk.green, chalk.yellow, chalk.blueBright, chalk.magenta,
];

const style = (id) =>
	colors[id % colors.length];

const [_writeLog, _writeError] = [
	process.stdout.write.bind(process.stdout),
	process.stderr.write.bind(process.stderr),
];

process.stdout.write = (...a) =>
	lastLoggedScopeId = void _writeLog(...a);

process.stderr.write = (...a) =>
	lastLoggedScopeId = void _writeError(...a);

/**
 *  Appends the value returned by the given function to the log output of every step
 *  @param {Function} func
 *  @return {void}
 */

module.exports.Solution.watchAll = func => {
	_logWatcher = func;
};

/**
 *  Adds a step to the current solution
 *  @param {String} desc
 *  @param {Function} func
 *  @return {void}
 */

module.exports.Step = (desc, func) => {
	solution.func.push(func);
	solution.desc.push(desc);
	solution.type.push('step');
};

/**
 *  Adds a catch to the current solution
 *  @param {String} desc
 *  @param {Function} func
 *  @return {void}
 */

module.exports.Catch = (desc, func) => {
	solution.func.push(func);
	solution.desc.push(desc);
	solution.type.push('catch');
};

/**
 *  Returns a Model based on the given JsonSchema definition
 *  @param {String} [schema.$id] - The name of the Model
 *  @return {Function} Model
 */

module.exports.JsonSchemaModel = ({$id, ...schema}) => {
	const _validation = ajv.compile({$id, ...schema});
	const Model = _makeObjValidatorModel(_validation);
	Object.defineProperty(Model, 'bind', {value: () => Model});
	Object.defineProperty(Model, 'name', {value: classify($id || 'Model')});
	Object.defineProperty(Model, 'pluralName', {value: pluralize(Model.name)});
	Object.defineProperty(Model, 'underscoreName', {value: underscore(Model.name)});
	Object.defineProperty(Model, 'camelCaseName', {value: camelize(Model.underscoreName, true)});
	Object.defineProperty(Model, 'pluralCamelCaseName', {value: pluralize(Model.camelCaseName)});
	Object.defineProperty(Model, 'pluralUnderscoreName', {value: pluralize(Model.underscoreName)});
	return new Proxy(Model, {set: (Model, k, f) => !void (Model[k] = f.bind({Model, methodName: k}))});
};

const _makeObjValidatorModel = _validation => function Model({...obj} = {}) {
	if (_validation(obj)) return obj;
	const {message, dataPath} = _validation.errors[0];
	throw Reject(`${Model.camelCaseName}${dataPath} ${message}`);
};

/**
 *  A method with properties allowing composition of logical/network handlers
 *  @property {Function} setLogicalHandler
 *  @property {Function} stackIoMiddleware
 *  @property {Function} bind
 */

module.exports.Method = Method(
	[], function _defaultHandler() { return _defaultHandler; },
);

const _makeMiddleware = ({filename, ...opt}) => (scope, logicalHandler) => {
	const handler = require(`ioMiddleware/${filename}.js`);
	if (handler instanceof Function) return handler({...scope, ...opt, logicalHandler});
	throw Error(`IO middleware should export a function: ioMiddleware/${filename}.js`);
};

const _makeHandler = ({filename, ...opt}) => scope => (...args) => {
	const handler = require(`logicalHandlers/${filename}.js`);
	if (handler instanceof Function) return handler({...scope, ...opt}, ...args);
	throw Error(`Logical handler should export a function: logicalHandlers/${filename}.js`);
};

function Method(io, logic) {
	const setLogicalHandler = opt => Method(io, _makeHandler(opt));
	const stackIoMiddleware = opt => Method([...io, _makeMiddleware(opt)], logic);
	const bind = scope => [...io].reverse().reduce((lgc, mdlwr) => mdlwr(scope, lgc) || lgc, logic(scope));
	return Object.assign(() => { throw Reject('no Method defined'); }, {stackIoMiddleware, setLogicalHandler, bind});
}
