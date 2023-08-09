'use strict';

const moveFiles = require('..');
const wraptile = require('wraptile');

const move = moveFiles('/tmp', '/tmp/root', ['ischanged']);
const {log} = console;

move
    .on('file', log)
    .on('error', log)
    .on('end', wraptile(log, 'done'));
