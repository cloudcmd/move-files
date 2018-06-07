'use strict';

const {join} = require('path');

const {EventEmitter} = require('events');

const test = require('tape');
const sinon = require('sinon');
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
    
    const renameFiles = (from, to, names, fn) => fn();
    
    mockRequire('@cloudcmd/rename-files', renameFiles);
    
    const moveFiles = rerequire('..');
    const mv = moveFiles(from, to, names);
    
    mv.on('end', () => {
        mockRequire.stop('@cloudcmd/rename-files');
        
        t.pass('should rename files');
        t.end();
    });
});

test('move-files: emit directory', async (t) => {
    const TIME = 10;
    const cp = new EventEmitter();
    
    cp.continue = sinon.stub();
    cp.abort = sinon.stub();
    cp.pause = sinon.stub();
    
    const copymitter = () => cp;
    
    const from = '/b';
    const to = '/a';
    const names = [
        'README',
    ];
    
    const renameFiles = (from, to, names, fn) => {
        fn(Error('hello'));
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
        
        t.pass('should emit file');
        t.end();
    });
    
    setTimeout(() => {
        cp.emit('file', 'helllo');
    }, TIME);
});

test('move-files: emit directory', (t) => {
    const TIME = 10;
    const cp = new EventEmitter();
    
    cp.continue = sinon.stub();
    cp.abort = sinon.stub();
    cp.pause = sinon.stub();
    
    const copymitter = () => cp;
    
    const from = '/b';
    const to = '/a';
    const names = [
        'README',
    ];
    
    const renameFiles = (from, to, names, fn) => {
        fn(Error('hello'));
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
        
        t.pass('should emit directory');
        t.end();
    });
    
    setTimeout(() => {
        cp.emit('directory', 'helllo');
    }, TIME);
});

test('move-files: emit end', async (t) => {
    const TIME = 10;
    const cp = new EventEmitter();
    
    cp.continue = sinon.stub();
    cp.abort = sinon.stub();
    cp.pause = sinon.stub();
    
    const copymitter = () => cp;
    
    const from = '/b';
    const to = '/a';
    const names = [
        'README',
        'LICENSE',
    ];
    
    const renameFiles = (from, to, names, fn) => {
        fn(Error('hello'));
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
    
    cp.continue = sinon.stub();
    cp.abort = sinon.stub();
    cp.pause = sinon.stub();
    
    const copymitter = () => cp;
    
    const from = '/b';
    const to = '/a';
    const names = [
        'README',
        'LICENSE',
    ];
    
    const renameFiles = (from, to, names, fn) => {
        fn(Error('hello'));
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

