'use strict';

const Command = require('leadfoot/Command');
const tap = require('tap');
const sessionPromise = require('../common')();

tap.test(__filename, t => {
  let session;

  return sessionPromise
    .then(s => {
      session = s;
      const command = new Command(session);

      return command.get('https://google.com')
        .getPageTitle()
        .then(title => {
          t.notEqual(title, '', 'non-empty title');

          return new Promise(resolve => setTimeout(resolve, 1000));
        })
        .then(() => {
          return session.server.deleteSession(session.sessionId);
        });
    });
});
