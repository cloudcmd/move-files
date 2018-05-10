# Move Files [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

Move files with emitter. Try to `rename` files first, and only if fail move them.

### Install

```
npm i @cloudcmd/move-files
```

### How to use?

```js
const moveFiles = require('@cloudcmd/move-files');
const cwd = process.cwd();
const from = cwd + '/pipe-io';
const to = cwd + '/example';
const abortOnError = false;

const mv = moveFiles(from, to, [
    'LICENSE',
    'README.md',
    'package.json'
]);

mv.on('file', function(from, to) {
    console.log(`${from} -> ${to}`);
});

mv.on('directory', function(from, to) {
    console.log(`${from} -> ${to}`);
});

mv.on('progress', function(percent) {
    console.log(percent);
    
    if (percent >= 50) {
        mv.pause();
        mv.continue();
    }
});

mv.on('pause', () => {
    console.log('paused');
    mv.continue();
});

mv.on('error', (error) => {
    console.error(`${percent} -> ${name}: ${error.message}`);
    
    if (abortOnError)
        return mv.abort();
    
    mv.continue();
});

mv.on('end', function() {
    console.log('Moving ended up');
});

mv.pause();
```

## Related

- [Remy](https://github.com/coderaiser/node-remy "Remy") - Remove files with emitter.
- [Jaguar](https://github.com/coderaiser/node-jaguar "Jaguar") - Pack and extract .tar.gz archives with emitter.
- [OneZip](https://github.com/coderaiser/node-onezip "OneZip") - Pack and extract zip archives with emitter.
- [Tar-to-zip](https://github.com/coderaiser/node-tar-to-zip "tar-to-zip") - Convert tar and tar.gz archives to zip.

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/@cloudcmd/move-files.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/cloudcmd/move-files/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/david/cloudcmd/move-files.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[CoverageIMGURL]:           https://coveralls.io/repos/cloudcmd/move-files/badge.svg?branch=master&service=github
[NPMURL]:                   https://npmjs.org/package/@cloudcmd/move-files "npm"
[BuildStatusURL]:           https://travis-ci.org/cloudcmd/move-files  "Build Status"
[DependencyStatusURL]:      https://david-dm.org/cloudcmd/move-files "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]:              https://coveralls.io/github/cloudcmd/move-files?branch=master

