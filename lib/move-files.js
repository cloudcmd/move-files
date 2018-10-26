'use strict';

const fs = require('fs');
const {EventEmitter} = require('events');
const {promisify} = require('util')

const wraptile = require('wraptile');
const currify = require('currify');
const fullstore = require('fullstore');

const renameFiles = require('@cloudcmd/rename-files');
const copymitter = require('copymitter');

const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

const initProgress = (value) => ({
    was: fullstore(),
    now: fullstore(value),
});

module.exports = (from, to, names) => {
    check(from, to, names);
    
    const move = new EventEmitter();
    
    renameFiles(from, to, names)
        .then(emitProgress(move, initProgress(100)))
        .catch(moveFiles(move, from, to, names));
    
    return move;
};

const moveFiles = wraptile((move, from, to, names) => {
    const copy = copymitter(from, to, names);
    const progress = initProgress();
    
    copy
        .on('file', rmFile(copy, move, progress))
        .on('directory', rmDirectory(copy, move, progress))
        .on('progress', progress.now)
        .on('continue', emitContinue(move))
        .on('error', emitError(move))
    
    move.continue = copy.continue.bind(copy);
    move.abort = () => {
        copy.abort();
        move.emit('end');
    };
    move.pause = copy.pause.bind(copy);
});

const continueCopy = wraptile((a) => a.continue());

const rmFile = currify((copy, move, progress, src) => {
    copy.pause();
    unlink(src)
        .then(emitFile(move))
        .then(continueCopy(copy))
        .catch(emitError(move))
        .then(emitProgress(move, progress))
});

const rmDirectory = currify((copy, move, progress, src) => {
    copy.pause();
    rmdir(src)
        .then(emitDirectory(move))
        .then(continueCopy(copy))
        .catch(emitError(move))
        .then(emitProgress(move, progress));
});

const emitFile = currify((move, src) => move.emit('file', src));
const emitDirectory = currify((move, src) => move.emit('directory', src));
const emitContinue = wraptile((a) => a.continue());
const emitProgress = wraptile((move, progress) => {
    const now = progress.now();
    const was = progress.was();
    
    if (was === now)
        return;
    
    progress.was(now);
    move.emit('progress', now);
    
    if (now !== 100)
        return;
    
    move.emit('end');
});

const emitError = currify((move, e) => {
    move.pause();
    move.emit('error', e);
});

function check(from, to, names) {
    if (typeof from !== 'string')
        throw Error('from should be a string!');
    
    if (typeof to !== 'string')
        throw Error('to should be a string!');
    
    if (!Array.isArray(names))
        throw Error('names should be an array!');
}

