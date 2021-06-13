'use strict';

const {EventEmitter} = require('events');
const {rm} = require('fs/promises');

const wraptile = require('wraptile');
const currify = require('currify');
const fullstore = require('fullstore');

const renameFiles = require('@cloudcmd/rename-files');
const copymitter = require('copymitter');

const TIME_TO_REMOVE = 100;

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
        .on('file', emitFile(move))
        .on('directory', emitDirectory(move))
        .on('progress', (a) => {
            if (a === TIME_TO_REMOVE)
                return;
            
            progress.now(a);
            
            const fn = emitProgress(move, progress);
            fn();
        })
        .on('continue', emitContinue(move))
        .on('error', emitError(move))
        .on('end', removeAll({
            move,
            from,
            names,
            progress,
        }));
    
    move.continue = copy.continue.bind(copy);
    move.abort = () => {
        copy.abort();
        move.emit('end');
    };
    move.pause = copy.pause.bind(copy);
});

const removeAll = wraptile(({move, from, names, progress}) => {
    const options = {
        force: true,
        recursive: true,
    };
    
    const removers = [];
    
    for (const name of names) {
        const fullName = `${from}${name}`;
        removers.push(rm(fullName, options));
    }
    
    progress.now(TIME_TO_REMOVE);
    
    Promise.all(removers)
        .then(emitProgress(move, progress))
        .catch(emitError(move));
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

