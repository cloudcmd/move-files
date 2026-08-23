import wraptile from 'wraptile';
import moveFiles from '../lib/move-files.js';

const move = moveFiles('/tmp', '/tmp/root', ['ischanged']);
const {log} = console;

move
    .on('file', log)
    .on('error', log)
    .on('end', wraptile(log, 'done'));
