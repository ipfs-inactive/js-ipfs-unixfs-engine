# ipfs-unixfs-engine

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Build Status](https://flat.badgen.net/travis/ipfs/js-ipfs-unixfs-engine)](https://travis-ci.com/ipfs/js-ipfs-unixfs-engine)
[![Codecov](https://codecov.io/gh/ipfs/js-ipfs-unixfs-engine/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/js-ipfs-unixfs-engine)
[![Dependency Status](https://david-dm.org/ipfs/js-ipfs-unixfs-engine.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-unixfs-engine)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D8.0.0-orange.svg?style=flat-square)

> JavaScript implementation of the layout and chunking mechanisms used by IPFS to handle Files

## Lead Maintainer

[Alex Potsides](https://github.com/achingbrain)

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Importing a file](#importing-a-file)
  - [Exporting a file](#exporting-a-file)
- [Contribute](#contribute)
- [License](#license)

## Install

```
> npm install ipfs-unixfs-engine
```

## Usage

The `unixfs-engine` exports the [`unixfs-importer`](https://npmjs.com/packages/ipfs-unixfs-importer) and [`unixfs-exporter`](https://npmjs.com/packages/ipfs-unixfs-exporter) modules.  Please see those modules for for full documentation.

### Importing a file

The importer is a [pull-stream through](https://github.com/pull-stream/pull-stream#through) which takes objects of the form `{ path, content }` where `path` is a string path and `content` can be a `Buffer`, a `ReadableStream` or a `pull-stream` that emits `Buffer`s.

It requires an [ipld](https://npmjs.com/packages/ipld) resolver to persist [DAGNodes](https://npmjs.com/packages/ipld-dag-pb) and make them available over IPFS.

See the [`unixfs-importer`](https://npmjs.com/packages/ipfs-unixfs-importer) module for full documentation.

```js
const {
  importer
} = require('ipfs-unixfs-engine')
const pull = require('pull-stream')
const fs = require('fs')

// Import path /tmp/bar.txt
pull(
  pull.values([{
    path: '/tmp/bar.txt',
    content: fs.createReadStream('/tmp/bar.txt')
  }]),

  // You need to create and pass an ipld resolver instance
  // https://npmjs.com/packages/ipld
  importer(<ipld-resolver instance>, <options>),

  // Handle the error and do something with the results
  pull.collect((err, files) => {
    console.info(files)

    // Prints:
    // [{
    //   size: 12,
    //   leafSize: 4,
    //   multihash: <Buffer>
    //   path: '/tmp/bar.txt',
    //   name: ''
    // }, {
    //   path: 'tmp',
    //   multihash: <Buffer>
    //   size: 65
    // }]
  })
)
```

### Exporting a file

The exporter is a [pull-stream source](https://github.com/pull-stream/pull-stream#source-readable-stream-that-produces-values) which takes a [cid](https://npmjs.com/packages/cids) and an [ipld](https://npmjs.com/packages/ipld) resolver.

See the [`unixfs-exporter`](https://npmjs.com/packages/ipfs-unixfs-exporter) module for full documentation.

```js
const {
  exporter
} = require('ipfs-unixfs-engine').exporter
const pull = require('pull-stream')
const drain = require('pull-stream/sinks/drain')

pull(
  // You need to create and pass an ipld resolver instance
  // https://npmjs.com/packages/ipld
  exporter(cid, ipld),
  drain((file) => {
    // file.content is a pull stream containing the bytes of the file
  })
)
```

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfs-unixfs-engine/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
