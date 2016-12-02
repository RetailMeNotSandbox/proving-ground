'use strict';

const mockery = require('mockery');
const sinon = require('sinon');
const tap = require('tap');
const EventEmitter = require('events');

tap.test('API', function (t) {
  t.autoend();

  mockery.enable({
    warnOnReplace: false,
    warnOnUnregistered: false
  });

  const mockSpawn = sinon.stub();

  let expected;
  function resetMockSpawn() {
    expected = new EventEmitter();
    expected.stderr = {};
    expected.stdout = {};

    mockSpawn.reset();
    mockSpawn.returns(expected);
  }

  mockery.registerMock('child_process', {
    spawn: mockSpawn
  });

  const provingGround = require('../');

  t.tearDown(() => {
    mockery.disable();
  });

  t.type(
    provingGround.run,
    'function',
    'exports a `run` method'
  );

  t.test('`run`', t => {
    t.autoend();

    t.test('spawns `prove` as a child process', t => {
      resetMockSpawn();

      provingGround.run()
        .on('start', () => {
          t.ok(mockSpawn.calledOnce, 'calls `child_process.spawn`');
          t.ok(
            mockSpawn.firstCall.calledWith('prove'),
            'passes `prove` as the command'
          );

          t.end();
        });
    });

    t.test('emits an `error` if `prove` exits due to a signal', t => {
      resetMockSpawn();

      provingGround.run()
        .on('error', err => {
          t.equal(err, 'SIG_FEELS');

          t.end();
        })
        .on('start', () => {
          expected.emit('exit', null, 'SIG_FEELS');
        });
    });

    t.test('return value', t => {
      resetMockSpawn();

      const result = provingGround.run();

      t.type(result, 'EventEmitter', 'is an `EventEmitter`');

      result.on('start', value => {
        t.type(
          value,
          'EventEmitter',
          'emitted value is an `EventEmitter`'
        );
        t.equal(
          value.stderr,
          expected.stderr,
          'emitted value has a `stderr` property that is the child stderr'
        );
        t.equal(
          value.stdout,
          expected.stdout,
          'emitted value has a `stdout` property that is the child stdout'
        );

        t.end();
      });
    });

    t.test('accepts an optional `config` object', t => {
      t.autoend();

      t.test('`config.exec`', t => {
        const expectedExec = "'node ./node_modules/.bin/mocha'";
        resetMockSpawn();

        provingGround.run()
          .on('start', () => {
            const args = mockSpawn.firstCall.args[1] || [];

            t.ok(
              args.join(' ').indexOf("--exec 'node'") >= 0,
              'tells prove to run the tests with node by default'
            );

            resetMockSpawn();

            provingGround.run({
              exec: expectedExec
            })
            .on('start', () => {
              const args = mockSpawn.firstCall.args[1] || [];

              t.ok(
                args.join(' ').indexOf('--exec ' + expectedExec) >= 0,
                'if `config.exec` set, tells prove to use that command'
              );

              t.end();
            });
          });
      });

      t.test('`config.numProcesses`', t => {
        const expectedNumProcesses = 42;
        resetMockSpawn();

        provingGround.run()
          .on('start', () => {
            const args = mockSpawn.firstCall.args[1] || [];

            t.ok(
              args.join(' ').indexOf('--jobs 1') >= 0,
              'tells prove use 1 process by default'
            );

            resetMockSpawn();

            provingGround.run({
              numProcesses: expectedNumProcesses
            })
            .on('start', () => {
              const args = mockSpawn.firstCall.args[1] || [];

              t.ok(
                args.join(' ').indexOf('--jobs ' + expectedNumProcesses) >= 0,
                'if `config.numProcesses` is provided, tells prove to use ' +
                  'that many processes'
              );

              t.end();
            });
          });
      });

      t.test('`config.files`', t => {
        resetMockSpawn();

        const expectedFiles = [
          'test/foo/**/*.js',
          'test/*.js'
        ];

        provingGround.run({
          files: expectedFiles
        })
        .on('start', () => {
          const args = mockSpawn.firstCall.args[1] || [];

          t.same(
            args.slice(-2),
            expectedFiles,
            '`config.files` elements should be passed as positional args'
          );

          t.end();
        });
      });

      t.test('`config.before`', t => {
        resetMockSpawn();

        const beforeStub = sinon.stub();

        provingGround.run({
          before: beforeStub
        });

        t.ok(beforeStub.calledOnce, 'called once');
        t.ok(!mockSpawn.called, 'called before `prove` spawned');
        t.type(beforeStub.firstCall.args[0], 'function', 'passed a callback');

        t.test('if `config.before` throws', t => {
          const expectedErr = new Error();

          resetMockSpawn();
          beforeStub.reset();
          beforeStub.throws(expectedErr);

          provingGround.run({
            before: beforeStub
          })
          .on('start', () => t.fail('start event should not be emitted'))
          .on('error', err => {
            t.equal(err, expectedErr, 'emits thrown error as `error` data');
            t.ok(!mockSpawn.called, '`prove` not spawned');

            t.end();
          });
        });

        t.test('if `config.before` returns a promise', t => {
          t.test('if promise resolves', t => {
            resetMockSpawn();
            beforeStub.reset();
            beforeStub.returns(Promise.resolve());

            provingGround.run({
              before: beforeStub
            })
            .on('start', () => {
              t.ok(mockSpawn.called, '`prove` spawned');

              t.end();
            });
          });

          t.test('if promise rejects', t => {
            const expectedErr = new Error();

            resetMockSpawn();
            beforeStub.reset();
            beforeStub.returns(Promise.reject(expectedErr));

            provingGround.run({
              before: beforeStub
            })
            .on('start', () => t.fail('start event should not be emitted'))
            .on('error', err => {
              t.equal(err, expectedErr, 'emits reason as `error` data');
              t.ok(!mockSpawn.called, '`prove` not spawned');

              t.end();
            });
          });

          t.end();
        });

        t.test('if `config.before` invokes its callback', t => {
          t.test('without an error', t => {
            resetMockSpawn();
            beforeStub.reset();
            beforeStub.returns(undefined);
            beforeStub.callsArgWith(0, null);

            provingGround.run({
              before: beforeStub
            })
            .on('start', () => {
              t.ok(mockSpawn.called, '`prove` spawned');

              t.end();
            });
          });

          t.test('with an error', t => {
            const expectedErr = new Error('ugh');

            resetMockSpawn();
            beforeStub.reset();
            beforeStub.returns(undefined);
            beforeStub.callsArgWith(0, expectedErr);

            provingGround.run({
              before: beforeStub
            })
            .on('start', () => t.fail('start event should not be emitted'))
            .on('error', err => {
              t.equal(err, expectedErr, 'emits passed error as `error` data');
              t.ok(!mockSpawn.called, '`prove` not spawned');

              t.end();
            });
          });

          t.end();
        });

        t.end();
      });

      t.test('`config.after`', t => {
        resetMockSpawn();

        const afterStub = sinon.stub().returns(Promise.resolve());

        t.test('called after `prove` runs', t => {
          provingGround.run({
            after: afterStub
          })
          .on('start', child => {
            expected.emit('exit', 0, null);
          })
          .on('error', err => t.fail(err))
          .on('end', () => {
            t.ok(afterStub.calledOnce, 'called once');
            t.ok(mockSpawn.called, 'called after `prove` spawned');
            t.type(
              afterStub.firstCall.args[0],
              'function',
              'passed a callback'
            );

            t.end();
          });
        });

        t.test('if `config.after` throws', t => {
          const expectedErr = new Error();

          afterStub.reset();
          afterStub.throws(expectedErr);

          provingGround.run({
            after: afterStub
          })
          .on('start', child => {
            expected.emit('exit', 0, null);
          })
          .on('end', () => t.fail('end event should not be emitted'))
          .on('error', err => {
            t.equal(err, expectedErr, 'emits thrown error as `error` data');

            t.end();
          });
        });

        t.test('if `config.after` returns a promise', t => {
          t.test('if promise resolves', t => {
            afterStub.reset();
            afterStub.returns(Promise.resolve());

            provingGround.run({
              after: afterStub
            })
            .on('start', child => {
              expected.emit('exit', 0, null);
            })
            .on('end', () => {
              t.pass('`end` emitted');

              t.end();
            });
          });

          t.test('if promise rejects', t => {
            const expectedErr = new Error();

            afterStub.reset();
            afterStub.returns(Promise.reject(expectedErr));

            provingGround.run({
              after: afterStub
            })
            .on('start', child => {
              expected.emit('exit', 0, null);
            })
            .on('end', () => t.fail('end event should not be emitted'))
            .on('error', err => {
              t.equal(err, expectedErr, 'emits reason as `error` data');

              t.end();
            });
          });

          t.end();
        });

        t.test('if `config.after` invokes its callback', t => {
          t.test('without an error', t => {
            afterStub.reset();
            afterStub.returns(undefined);
            afterStub.callsArgWith(0, null);

            provingGround.run({
              after: afterStub
            })
            .on('start', child => {
              expected.emit('exit', 0, null);
            })
            .on('end', () => {
              t.pass('`end` emitted');

              t.end();
            });
          });

          t.test('with an error', t => {
            const expectedErr = new Error('ugh');

            afterStub.reset();
            afterStub.returns(undefined);
            afterStub.callsArgWith(0, expectedErr);

            provingGround.run({
              after: afterStub
            })
            .on('start', child => {
              expected.emit('exit', 0, null);
            })
            .on('end', () => t.fail('end event should not be emitted'))
            .on('error', err => {
              t.equal(err, expectedErr, 'emits passed error as `error` data');

              t.end();
            });
          });

          t.end();
        });

        t.end();
      });
    });
  });
});
