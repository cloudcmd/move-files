import {once, EventEmitter} from 'node:events';
import {test, stub} from 'supertape';
import {tryCatch} from 'try-catch';
import wait from '@iocmd/wait';
import moveFiles from '../lib/move-files.js';

test('move-files: no args', (t) => {
    const [error] = tryCatch(moveFiles);
    
    t.equal(error.message, 'from should be a string!', 'should throw when no from');
    t.end();
});

test('move-files: no to', (t) => {
    const from = '/';
    const [e] = tryCatch(moveFiles, from);
    
    t.equal(e.message, 'to should be a string!', 'should throw when no from');
    t.end();
});

test('move-files: no names', (t) => {
    const from = '/';
    const to = '/tmp';
    const [e] = tryCatch(moveFiles, from, to);
    
    t.equal(e.message, 'names should be an array!', 'should throw when no from');
    t.end();
});

test('move-files: error', async (t) => {
    const from = '/b';
    const to = '/a';
    const names = ['README'];
    
    const mv = moveFiles(from, to, names);
    const [e] = await once(mv, 'error');
    
    t.equal(e.code, 'ENOENT', 'should be error');
    t.end();
});

test('move-files: error: abort: abort', async (t) => {
    const from = '/b';
    const to = '/a';
    const names = ['README'];
    
    const mv = moveFiles(from, to, names);
    
    await once(mv, 'error');
    const abort = mv.abort.bind(mv);
    
    await Promise.all([
        once(mv, 'abort'),
        abort(),
    ]);
    
    t.pass(`should emit 'aborted'`);
    t.end();
});

test('move-files: rename: success', async (t) => {
    const from = '/b';
    const to = '/a';
    const names = ['README'];
    const renameFiles = stub().resolves();
    
    const mv = moveFiles(from, to, names, {
        renameFiles,
    });
    
    await once(mv, 'end');
    
    t.pass('should rename files');
    t.end();
});

test('move-files: emit end', async (t) => {
    const TIME = 10;
    const cp = new EventEmitter();
    
    cp.continue = stub();
    cp.abort = stub();
    cp.pause = stub();
    
    const copymitter = () => cp;
    
    const from = '/b';
    const to = '/a';
    
    const names = [
        'README',
        'LICENSE',
    ];
    
    const renameFiles = stub().rejects(Error('hello'));
    
    const remove = stub().resolves();
    const mv = moveFiles(from, to, names, {
        remove,
        renameFiles,
        copymitter,
    });
    
    await wait(TIME, stub());
    
    const emitCP = () => {
        cp.emit('progress', 50);
        cp.emit('file', 'README');
        cp.emit('progress', 100);
        cp.emit('file', 'LICENSE');
        cp.emit('end', {
            errors: [],
        });
    };
    
    await Promise.all([
        once(mv, 'end'),
        emitCP(),
    ]);
    
    t.pass('should emit file');
    t.end();
});

test('move-files: emit end: errors', async (t) => {
    const TIME = 10;
    const cp = new EventEmitter();
    
    cp.continue = stub();
    cp.abort = stub();
    cp.pause = stub();
    
    const copymitter = () => cp;
    
    const from = '/b';
    const to = '/a';
    
    const names = [
        'README',
        'LICENSE',
    ];
    
    const renameFiles = stub().rejects(Error('hello'));
    
    const remove = stub().resolves();
    const mv = moveFiles(from, to, names, {
        copymitter,
        renameFiles,
        remove,
    });
    
    await wait(TIME, stub());
    
    const emitCP = () => {
        cp.emit('progress', 50);
        cp.emit('file', 'README');
        cp.emit('progress', 100);
        cp.emit('file', 'LICENSE');
        cp.emit('end', {
            errors: [1],
        });
    };
    
    await Promise.all([
        once(mv, 'end'),
        emitCP(),
    ]);
    
    t.pass('should emit file');
    t.end();
});

test('move-files: emit progress', async (t) => {
    const TIME = 10;
    const cp = new EventEmitter();
    
    cp.continue = stub();
    cp.abort = stub();
    cp.pause = stub();
    
    const copymitter = () => cp;
    
    const from = '/b';
    const to = '/a';
    
    const names = [
        'README',
        'LICENSE',
    ];
    
    const renameFiles = stub().rejects(Error('hello'));
    
    const remove = stub().resolves();
    const mv = moveFiles(from, to, names, {
        copymitter,
        renameFiles,
        remove,
    });
    
    await wait(TIME, stub());
    
    const emitProgress = () => {
        cp.emit('progress', 50);
        cp.emit('file', 'hello');
    };
    
    const [[n]] = await Promise.all([
        once(mv, 'progress'),
        emitProgress(),
    ]);
    
    t.equal(n, 50, 'should emit progress');
    t.end();
}, {
    checkAssertionsCount: false,
});
