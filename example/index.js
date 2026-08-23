'use strict';

const wraptile = require('wraptile');
const moveFiles = require('..');

const move = moveFiles('/tmp', '/tmp/root', ['ischanged']);
const {log} = console;

move
    .on('file', log)
    .on('error', log)
    .on('end', wraptile(log, 'done'));
