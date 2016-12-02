#!/usr/bin/env node
'use strict';

const path = require('path');
const provingGround = require('../');

const argv = require('yargs')
  .usage('Usage: $0 [options] [files or directories]')
  .option('e', {
    alias: 'exec',
    default: 'node',
    describe: 'the command to pass to prove as its `exec` parameter',
    type: 'string'
  })
  .option('n', {
    alias: 'num-processes',
    default: 1,
    describe: 'the level of parallelism `prove` should employ',
    type: 'string'
  })
  .option('before', {
    default: null,
    describe: 'a module exporting a function to run before `prove`',
    type: 'string'
  })
  .option('after', {
    default: null,
    describe: 'a module exporting a function to run after `prove`',
    type: 'string'
  })
  .help('h')
  .alias('h', 'help')
  .version()
  .argv;

const config = {
  exec: argv.exec,
  numProcesses: argv.n,
  files: argv._
};

if (argv.before !== null) {
  config.before = require(path.resolve(argv.before));
}

if (argv.after !== null) {
  config.after = require(path.resolve(argv.after));
}

provingGround.run(config)
  .on('error', err => {
    console.error(err.stack);
    process.exit(1);
  })
  .on('start', child => {
    child.stderr.pipe(process.stderr);
    child.stdout.pipe(process.stdout);
  })
  .on('end', code => {
    process.exit(code);
  });
