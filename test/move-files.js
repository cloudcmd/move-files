'use strict';

const {join} = require('path');
const {EventEmitter} = require('events');

const test = require('supertape');
const stub = require('@cloudcmd/stub');
const readjson = require('readjson');
const {Volume} = require('memfs');
const tryCatch = require('try-catch');
const mockRequire = require('mock-require');

const FIXTURE_PATH = join(__dirname, 'fixture', 'volume.json');
const FIXTURE = readjson.sync(FIXTURE_PATH);

const moveFiles = require('..');

test('move-files: no args', (t) => {
    t.throws(moveFiles, /from should be a string!/, 'should throw when no from');
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

test('move-files: error', async(t) => {
    const from = '/b';
    const to = '/a';
    const names = [
        'README',
    ];
    
    const vol = Volume.fromJSON(FIXTURE, '/');
    vol.rename = vol.rename.bind(vol);
    
    mockRequire('fs', vol);
    
    const moveFiles = rerequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.on('error', (e) => {
        t.equal(e.code, 'ENOENT', 'should be error');
        
        mockRequire.stop('fs');
        t.end();
    });
});

test('move-files: error: abort: end', async(t) => {
    const from = '/b';
    const to = '/a';
    const names = [
        'README',
    ];
    
    const vol = Volume.fromJSON(FIXTURE, '/');
    vol.rename = vol.rename.bind(vol);
    
    mockRequire('fs', vol);
    
    const moveFiles = rerequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.on('error', () => {
        mv.abort();
    });
    
    mv.on('end', () => {
        t.pass('should emit end');
        
        mockRequire.stop('fs');
        t.end();
    });
});

test('move-files: rename: success', async(t) => {
    const from = '/b';
    const to = '/a';
    const names = [
        'README',
    ];
    
    const renameFiles = async () => {};
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    
    const moveFiles = rerequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.on('end', () => {
        mockRequire.stop('@cloudcmd/rename-files');
        
        t.pass('should rename files');
        t.end();
    });
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
    
    const fs = require('fs');
    const {unlink} = fs;
    fs.unlink = (path, fn) => {
        fn();
    };
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    mockRequire('copymitter', copymitter);
    
    const moveFiles = rerequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.once('file', () => {
        mockRequire.stop('@cloudcmd/rename-files');
        mockRequire.stop('copymitter');
        
        fs.unlink = unlink;
        rerequire('copymitter');
        rerequire('mkdirp');
        
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
    
    const fs = require('fs');
    const {unlink} = fs;
    fs.rmdir = (path, fn) => {
        fn();
    };
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    mockRequire('copymitter', copymitter);
    
    const moveFiles = rerequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.once('directory', () => {
        mockRequire.stop('@cloudcmd/rename-files');
        mockRequire.stop('copymitter');
        
        fs.unlink = unlink;
        rerequire('copymitter');
        rerequire('mkdirp');
        
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
    
    const fs = require('fs');
    const {unlink} = fs;
    fs.unlink = (path, fn) => {
        fn();
    };
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    mockRequire('copymitter', copymitter);
    
    const moveFiles = rerequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.on('end', () => {
        mockRequire.stop('@cloudcmd/rename-files');
        mockRequire.stop('copymitter');
        
        fs.unlink = unlink;
        rerequire('copymitter');
        rerequire('mkdirp');
        
        t.pass('should emit file');
        t.end();
    });
    
    setTimeout(() => {
        cp.emit('progress', 50);
        cp.emit('file', 'README');
        cp.emit('progress', 100);
        cp.emit('file', 'LICENSE');
    }, TIME);
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
    };
    
    const fs = require('fs');
    const {unlink} = fs;
    fs.unlink = (path, fn) => {
        fn();
    };
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    mockRequire('copymitter', copymitter);
    
    const moveFiles = rerequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.on('progress', (n) => {
        mockRequire.stop('@cloudcmd/rename-files');
        mockRequire.stop('copymitter');
        
        fs.unlink = unlink;
        rerequire('copymitter');
        rerequire('mkdirp');
        
        t.pass('should emit file');
        t.equal(n, 50, 'should emit progress');
        t.end();
    });
    
    setTimeout(() => {
        cp.emit('progress', 50);
        cp.emit('file', 'hello');
    }, TIME);
});

function rerequire(name) {
    delete require.cache[require.resolve(name)];
    return require(name);
}

