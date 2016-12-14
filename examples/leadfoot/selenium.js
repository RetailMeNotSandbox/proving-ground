'use strict';

const selenium = require('selenium-standalone');

const URL = 'http://localhost:4444';
const children = [];

function setup(numNodes, done) {
  console.log('Starting selenium grid with %d nodes...', numNodes);

  function callback(err, child) {
    if (err) {
      console.error(err, err.stack);
      teardown();
      return;
    }

    children.push(child);

    if (children.length >= numNodes + 1) {
      console.log('...done');
      done();
    }
  }

  selenium.start({
    seleniumArgs: ['-role', 'hub']
  }, (err, child) => {
    if (err) {
      done(err);
      return;
    }

    children.push(child);

    for (let i = 0; i < numNodes; i++) {
      selenium.start({
        seleniumArgs: [
          '-role', 'node',
          URL + '/grid/register',
          '-port', 5555 + i
        ]
      }, callback);
    }
  });
}

function teardown(done) {
  console.log('Tearing down selenium grid...');
  while (children.length > 0) {
    children.pop().kill();
  }

  console.log('...done');
  done();
}

module.exports = {
  setup: setup,
  teardown: teardown,
  URL: URL
};
