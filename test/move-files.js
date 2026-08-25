import {once, EventEmitter} from 'node:events';
import {test, stub} from 'supertape';
import {tryCatch} from 'try-catch';
import wait from '@iocmd/wait';
import {moveFiles} from '../lib/move-files.js';

const TIME = 10;

const makeCP = () => {
    const cp = new EventEmitter();
    
    cp.continue = stub();
    cp.abort = stub();
    cp.pause = stub();
    
    return cp;
};

const makeStubs = (cp) => ({
    rename: stub().rejects(Error('rename failed')),
    copyFiles: () => cp,
    remove: stub().resolves(),
});

test('move-files: no args', (t) => {
    const [error] = tryCatch(moveFiles);
    
    t.equal(error.message, 'from should be a string!');
    t.end();
});

test('move-files: no to', (t) => {
    const [e] = tryCatch(moveFiles, '/');
    
    t.equal(e.message, 'to should be a string!');
    t.end();
});

test('move-files: no names', (t) => {
    const [e] = tryCatch(moveFiles, '/', '/tmp');
    
    t.equal(e.message, 'names should be an array!');
    t.end();
});

test('move-files: rename: success', async (t) => {
    const rename = stub().resolves();
    const cp = makeCP();
    const {remove, copyFiles} = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README'], {
        rename,
        remove,
        copyFiles,
    });
    
    await once(mv, 'end');
    
    t.pass('should emit end on rename success');
    t.end();
});

test('move-files: emit end', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README', 'LICENSE'], stubs);
    const emit = cp.emit.bind(cp);
    
    await wait(TIME, stub());
    
    await Promise.all([
        once(mv, 'end'),
        emit('progress', 50),
        emit('file', 'README'),
        emit('progress', 100),
        emit('file', 'LICENSE'),
        emit('end', {
            errors: [],
        }),
    ]);
    
    t.pass('should emit end');
    t.end();
});

test('move-files: emit end: errors', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README', 'LICENSE'], stubs);
    const emit = cp.emit.bind(cp);
    
    await wait(TIME, stub());
    
    await Promise.all([
        once(mv, 'end'),
        emit('end', {
            errors: [
                Error('write failed'),
            ],
        }),
    ]);
    
    t.pass('should emit end when copy errors exist');
    t.end();
});

test('move-files: emit progress', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README', 'LICENSE'], stubs);
    const emit = cp.emit.bind(cp);
    
    await wait(TIME, stub());
    
    const [[n]] = await Promise.all([
        once(mv, 'progress'),
        emit('progress', 50),
    ]);
    
    t.equal(n, 50, 'should emit progress');
    t.end();
}, {
    checkAssertionsCount: false,
});

test('move-files: progress: TIME_TO_REMOVE: skip', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README'], stubs);
    
    await wait(TIME, stub());
    
    let progressCount = 0;
    mv.on('progress', () => ++progressCount);
    
    cp.emit('progress', 50);
    cp.emit('progress', 100);
    // TIME_TO_REMOVE — should be skipped
    await wait(TIME, stub());
    
    t.equal(progressCount, 1, 'should skip progress at TIME_TO_REMOVE');
    t.end();
});

test('move-files: emit file', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    const emit = cp.emit.bind(cp);
    
    const mv = moveFiles('/b', '/a', ['README'], stubs);
    
    await wait(TIME, stub());
    
    const [[src]] = await Promise.all([
        once(mv, 'file'),
        emit('file', 'README'),
    ]);
    
    t.equal(src, 'README', 'should emit file');
    t.end();
});

test('move-files: emit directory', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['mydir'], stubs);
    const emit = cp.emit.bind(cp);
    
    await wait(TIME, stub());
    
    const [[dir]] = await Promise.all([
        once(mv, 'directory'),
        emit('directory', 'mydir'),
    ]);
    
    t.equal(dir, 'mydir', 'should emit directory');
    t.end();
});

test('move-files: emit continue', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    moveFiles('/b', '/a', ['README'], stubs);
    
    await wait(TIME, stub());
    
    cp.emit('continue');
    
    await wait(TIME, stub());
    
    t.ok(cp.continue.called, 'should call copy.continue on continue event');
    t.end();
});

test('move-files: error: emits error and pauses', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README'], stubs);
    const emit = cp.emit.bind(cp);
    
    await wait(TIME, stub());
    
    const [[err]] = await Promise.all([
        once(mv, 'error'),
        emit('error', Error('copy failed')),
    ]);
    
    t.equal(err.message, 'copy failed', 'should emit error');
    t.end();
});

test('move-files: abort: emits abort and calls copy.abort', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README'], stubs);
    
    await wait(TIME, stub());
    
    await Promise.all([
        once(mv, 'abort'),
        mv.abort(),
    ]);
    
    t.ok(cp.abort.called, 'should call copy.abort');
    t.end();
});

test('move-files: abort: via copy abort event', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README'], stubs);
    const emit = cp.emit.bind(cp);
    
    await wait(TIME, stub());
    
    await Promise.all([
        once(mv, 'abort'),
        emit('abort'),
    ]);
    
    t.pass('should emit abort from copy abort event');
    t.end();
});

test('move-files: pause: delegates to copy.pause', async (t) => {
    const cp = makeCP();
    const stubs = makeStubs(cp);
    
    const mv = moveFiles('/b', '/a', ['README'], stubs);
    
    await wait(TIME, stub());
    
    mv.pause();
    
    t.ok(cp.pause.called, 'should delegate pause to copymitter');
    t.end();
});

test('move-files: remove: error', async (t) => {
    const cp = makeCP();
    const stubs = {
        ...makeStubs(cp),
        remove: stub().rejects(Error('remove failed')),
    };
    
    const mv = moveFiles('/b', '/a', ['README'], stubs);
    
    await wait(TIME, stub());
    const emit = cp.emit.bind(cp);
    
    const [[err]] = await Promise.all([
        once(mv, 'error'),
        emit('end', {
            errors: [],
        }),
    ]);
    
    t.equal(err.message, 'remove failed', 'should emit error when remove fails');
    t.end();
});
