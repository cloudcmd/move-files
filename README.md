# Move Files [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

Move files with emitter and `zip` archives support. Try to `rename` files first, and only if fail copy them to destination and then remove from source.

### Install

```
npm i @cloudcmd/move-files
```

### How to use?

```js
const moveFiles = require('@cloudcmd/move-files');
const cwd = process.cwd();
const from = `${cwd}/pipe-io`;
const to = `${cwd}/example`;
const abortOnError = false;

const mv = moveFiles(from, to, [
    'LICENSE',
    'README.md',
    'package.json',
]);

mv.on('file', (from, to) => {
    console.log(`${from} -> ${to}`);
});

mv.on('directory', (from, to) => {
    console.log(`${from} -> ${to}`);
});

mv.on('progress', (percent) => {
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
    
    mv.continue();
});

mv.on('end', () => {
    console.log('Moving ended up');
});

mv.on('abort', () => {
    console.log('Aborted');
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

[NPMIMGURL]: https://img.shields.io/npm/v/@cloudcmd/move-files.svg?style=flat
[BuildStatusURL]: https://github.com/cloudcmd/move-files/actions
[BuildStatusIMGURL]: https://github.com/cloudcmd/move-files/actions/workflows/nodejs.yml/badge.svg
[LicenseIMGURL]: https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[CoverageIMGURL]: https://coveralls.io/repos/cloudcmd/move-files/badge.svg?branch=master&service=github
[NPMURL]: https://npmjs.org/package/@cloudcmd/move-files "npm"
[LicenseURL]: https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]: https://coveralls.io/github/cloudcmd/move-files?branch=master
