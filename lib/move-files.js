'use strict';

const fs = require('fs');
const EventEmitter = require('events').EventEmitter;

const promisify = require('es6-promisify').promisify;
const wraptile = require('wraptile/legacy');
const currify = require('currify/legacy');
const fullstore = require('fullstore');

const renameFiles = promisify(require('@cloudcmd/rename-files'));
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
        .on('continue', emitContinue(copy))
        .on('error', emitError(copy, move));
    
    move.continue = copy.continue.bind(copy);
    move.abort = copy.abort.bind(copy)
    move.pause = copy.pause.bind(copy);
});

const rmFile = currify((copy, move, progress, src) => {
    unlink(src)
        .then(emitFile(move))
        .then(emitProgress(move, progress))
        .catch(emitError(copy, move));
});

const rmDirectory = currify((copy, move, progress, src) => {
    rmdir(src)
        .then(emitDirectory(move))
        .then(emitProgress(move, progress))
        .catch(emitError(copy, move));
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

const emitError = currify((copy, move, e) => {
    copy.pause();
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

