'use strict';

const moveFiles = require('..');
const wraptile = require('wraptile');

const move = moveFiles('/tmp', '/tmp/root', [
    'ischanged'
]);

move.on('file', console.log)
    .on('error', console.log)
    .on('end', wraptile(console.log, 'done'));

