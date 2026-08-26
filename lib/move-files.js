import {EventEmitter} from 'node:events';
import * as redzip from 'redzip';
import wraptile from 'wraptile';
import currify from 'currify';
import {fullstore} from 'fullstore';
import renameFiles from '@cloudcmd/rename-files';
import {copymitter} from 'copymitter';

const isString = (a) => typeof a === 'string';
const TIME_TO_REMOVE = 100;

const initProgress = (value) => ({
    was: fullstore(),
    now: fullstore(value),
});

const compare = (a, b) => b.length - a.length

export const moveFiles = (from, to, names, overrides = {}) => {
    const {
        remove = redzip.remove,
        rename = renameFiles,
        copyFiles = copymitter,
    } = overrides;
    check(from, to, names);
    
    const move = new EventEmitter();
    
    rename(from, to, names)
        .then(emitProgress(move, initProgress(100)))
        .catch(moveAllFiles(move, from, to, names, {
            copyFiles,
            remove,
        }));
    
    return move;
};

const moveAllFiles = wraptile((move, from, to, names, {copyFiles, remove}) => {
    const copy = copyFiles(from, to, names);
    const progress = initProgress();
    
    const copiedFiles = [];
    const copiedDirs = [];
    
    const collectFile = (src) => {
        copiedFiles.push(src);
        move.emit('file', src);
    };
    
    const collectDirectory = (src) => {
        copiedDirs.push(src);
        move.emit('directory', src);
    };
    
    copy
        .on('file', collectFile)
        .on('directory', collectDirectory)
        .on('progress', (a) => {
            if (a === TIME_TO_REMOVE)
                return;
            
            progress.now(a);
            
            const fn = emitProgress(move, progress);
            fn();
        })
        .on('continue', emitContinue(move))
        .on('error', emitError(move))
        .on('abort', emitAbort(move))
        .on('end', removeAll({
            move,
            from,
            names,
            copiedFiles,
            copiedDirs,
            progress,
            remove,
        }));
    
    move.continue = copy.continue.bind(copy);
    move.abort = () => {
        copy.abort();
        move.emit('abort');
    };
    move.pause = copy.pause.bind(copy);
});

const removeAll = wraptile(({move, from, names, copiedFiles, copiedDirs, progress, remove}, {errors}) => {
    const doProgress = emitProgress(move, progress);
    
    if (errors.length) {
        progress.now(100);
        return doProgress();
    }
    
    progress.now(TIME_TO_REMOVE);
    
    if (!copiedDirs.length) {
        const removers = names.map((name) => remove(`${from}${name}`));
        
        Promise
            .all(removers)
            .then(doProgress)
            .catch(emitError(move));
        
        return;
    }
    
    const dirsDeepestFirst = copiedDirs
        .toSorted(compare);
    
    const removeSequential = async () => {
        for (const file of copiedFiles)
            await remove(file);
        
        for (const dir of dirsDeepestFirst)
            await remove(dir);
    };
    
    removeSequential()
        .then(doProgress)
        .catch(emitError(move));
});

const emitContinue = wraptile((a) => a.continue());

const emitProgress = wraptile((move, progress) => {
    const now = progress.now();
    
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

const emitAbort = wraptile((move) => {
    move.emit('abort');
});

function check(from, to, names) {
    if (!isString(from))
        throw Error('from should be a string!');
    
    if (!isString(to))
        throw Error('to should be a string!');
    
    if (!Array.isArray(names))
        throw Error('names should be an array!');
}
