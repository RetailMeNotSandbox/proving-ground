'use strict';

const Server = require('leadfoot/Server');

module.exports = () => {
  const server = new Server('http://localhost:4444/wd/hub');

  return server.createSession({
    browserName: 'chrome'
  })
  .catch((err) => {
    console.error('DOH!', err.message);
    console.error(err.stack);
  });
};
