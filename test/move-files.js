'use strict';

const {join} = require('path');
const fs = require('fs/promises');
const {
    once,
    EventEmitter,
} = require('events');

const {test, stub} = require('supertape');
const readjson = require('readjson');
const {Volume} = require('memfs');
const tryCatch = require('try-catch');
const mockRequire = require('mock-require');
const wait = require('@iocmd/wait');

const moveFiles = require('..');

const FIXTURE_PATH = join(__dirname, 'fixture', 'volume.json');
const FIXTURE = readjson.sync(FIXTURE_PATH);

const {stopAll, reRequire} = mockRequire;

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
    const vol = Volume.fromJSON(FIXTURE, '/');
    vol.rename = vol.rename.bind(vol);
    mockRequire('fs', vol);
    const moveFiles = reRequire('..');
    const mv = moveFiles(from, to, names);
    const [e] = await once(mv, 'error');
    t.equal(e.code, 'ENOENT', 'should be error');
    mockRequire.stop('fs');
    t.end();
});

test('move-files: error: abort: end', async (t) => {
    const from = '/b';
    const to = '/a';
    const names = ['README'];
    const vol = Volume.fromJSON(FIXTURE, '/');
    vol.rename = vol.rename.bind(vol);
    mockRequire('fs', vol);
    
    const moveFiles = reRequire('..');
    const mv = moveFiles(from, to, names);
    
    await once(mv, 'error');
    const abort = mv.abort.bind(mv);
    
    await Promise.all([
        once(mv, 'end'),
        abort(),
    ]);
    
    mockRequire.stop('fs');
    
    t.pass('should emit end');
    t.end();
});

test('move-files: rename: success', async (t) => {
    const from = '/b';
    const to = '/a';
    const names = ['README'];
    const renameFiles = async () => {};
    mockRequire('@cloudcmd/rename-files', renameFiles);
    const moveFiles = reRequire('..');
    const mv = moveFiles(from, to, names);
    await once(mv, 'end');
    mockRequire.stop('@cloudcmd/rename-files');
    t.pass('should rename files');
    t.end();
});

test('move-files: emit file: pause', async (t) => {
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
    ];
    
    const renameFiles = async () => {
        throw Error('hello');
    };
    
    const {unlink} = fs;
    fs.unlink = async () => {};
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    mockRequire('copymitter', copymitter);
    
    const moveFiles = reRequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.once('file', () => {
        mockRequire.stop('@cloudcmd/rename-files');
        mockRequire.stop('copymitter');
        
        fs.unlink = unlink;
        reRequire('copymitter');
        reRequire('mkdirp');
        
        t.ok(cp.pause.called, 'should call pause');
        t.end();
    });
    
    setTimeout(() => {
        cp.emit('file', 'helllo');
    }, TIME);
});

test('move-files: emit directory: pause', (t) => {
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
    ];
    
    const renameFiles = async () => {
        throw Error('hello');
    };
    
    const {unlink} = fs;
    fs.rmdir = async () => {};
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    mockRequire('copymitter', copymitter);
    
    const moveFiles = reRequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.once('directory', () => {
        mockRequire.stop('@cloudcmd/rename-files');
        mockRequire.stop('copymitter');
        
        fs.unlink = unlink;
        reRequire('copymitter');
        reRequire('mkdirp');
        
        t.ok(cp.pause.called, 'should call pause');
        t.end();
    });
    
    setTimeout(() => {
        cp.emit('directory', 'helllo');
    }, TIME);
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
    
    const renameFiles = async () => {
        throw Error('hello');
    };
    
    const unlink = async () => {};
    
    mockRequire('fs/promises', {
        ...require('fs/promises'),
        unlink,
    });
    mockRequire('@cloudcmd/rename-files', renameFiles);
    mockRequire('copymitter', copymitter);
    
    const moveFiles = reRequire('..');
    
    const mv = moveFiles(from, to, names);
    await wait(TIME, stub());
    
    const emitCP = () => {
        cp.emit('progress', 50);
        cp.emit('file', 'README');
        cp.emit('progress', 100);
        cp.emit('file', 'LICENSE');
        cp.emit('end');
    };
    
    await Promise.all([
        once(mv, 'end'),
        emitCP(),
    ]);
    
    stopAll();
    
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

    const renameFiles = async () => {
        throw Error('hello');
        cp.emit('end');
    };

    const unlink = stub().resolves();

    mockRequire('fs/promises', {
        ...require('fs/promises'),
        unlink,
    });
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    mockRequire('copymitter', copymitter);

    const moveFiles = reRequire('..');
    const mv = moveFiles(from, to, names);
    
    await wait(TIME, stub());
    
    const emitProgress = async () => {
        cp.emit('progress', 50);
        cp.emit('file', 'hello');
    };

    const [[n]] = await Promise.all([
        once(mv, 'progress'),
        emitProgress(),
    ]);
    
    stopAll();

    t.pass('should emit file');
    t.equal(n, 50, 'should emit progress');
    t.end();
});

