'use strict';

const {JsonSchemaModel, Method} = require('conventions/core');

/**
 *  Replace this sentence with a description of the below Model
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports = JsonSchemaModel({
	$id: 'ReplaceMe'
});

/**
 *  Minimum properties required to uniquely identify a ReplaceMe
 *  @param {Object} srcObj
 *  @param {Function} [next]
 *  @return {Object} validObj
 */

module.exports.Ids = JsonSchemaModel({
	$id: 'ReplaceMeIds'
});

/**
 *  Method definitions
 */

module.exports.replaceMe = Method
	.stackIoMiddleware({filename: 'replaceMe' /* Replace this comment with options per the chosen filename */})

module.exports.replaceMe = Method
	.stackIoMiddleware({filename: 'replaceMe' /* Replace this comment with options per the chosen filename */})
	.stackIoMiddleware({filename: 'replaceMe' /* Replace this comment with options per the chosen filename */});
