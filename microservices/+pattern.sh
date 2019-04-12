#!/usr/bin/env bash

export MKPLDB=mongodb://localhost:27017/marketplaceDB
export AMQP=amqp://localhost:5672
export NODE_PATH=.

node logicalModels/ReplaceMe.js;