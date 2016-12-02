'use strict';
const spawn = require('child_process').spawn;
const EventEmitter = require('events');

function callAsync(fn) {
  return new Promise((resolve, reject) => {
    const callback = (err, value) => {
      if (err != null) {
        reject(err);
      } else {
        resolve(value);
      }
    };

    let fnResult;
    try {
      fnResult = fn(callback);
    } catch (err) {
      reject(err);
    }

    if (
      fnResult &&
      typeof fnResult.then === 'function' &&
      typeof fnResult.then === 'function'
    ) {
      fnResult.then(resolve).catch(reject);
    }
  });
}

function run(config) {
  const emitter = new EventEmitter();

  config = config || {};
  config.exec = config.exec || "'node'";
  config.files = config.files || [];
  config.numProcesses = config.numProcesses || 1;

  let beforePromise = Promise.resolve();

  if (config.before) {
    beforePromise = callAsync(config.before);
  }

  beforePromise
    .then(() => {
      let child = spawn(
        'prove',
        [
          '--exec',
          config.exec,
          '--jobs',
          config.numProcesses
        ].concat(config.files)
      );

      const promise = new Promise((resolve, reject) => {
        child.on('error', reject);

        child.on('exit', (code, signal) => {
          if (signal) {
            reject(signal);
          }

          resolve(code);
        });
      });

      emitter.emit('start', child);

      return promise;
    })
    .then(code => {
      let afterPromise = Promise.resolve();

      if (config.after) {
        afterPromise = callAsync(config.after);
      }

      return afterPromise.then(() => {
        emitter.emit('end', code);
      });
    })
    .catch(err => emitter.emit('error', err));

  return emitter;
}

module.exports = {
  run: run
};
