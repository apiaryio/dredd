import clone from 'clone';
import crossSpawnStub from 'cross-spawn';
import net from 'net';
import path from 'path';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import { assert } from 'chai';
import { EventEmitter } from 'events';

import whichStub from '../../lib/which';
import loggerStub from '../../lib/logger';

import Hooks from '../../lib/Hooks';
import * as commandLineOptions from '../../options';
import TransactionRunner from '../../lib/TransactionRunner';

function measureExecutionDurationMs(fn) {
  const time = process.hrtime();
  fn();
  const timeDiff = process.hrtime(time); // timeDiff = [seconds, nanoseconds]
  return timeDiff[0] * 1000 + timeDiff[1] * 1e-6;
}

const COFFEE_BIN = 'node_modules/.bin/coffee';
const MIN_COMMAND_EXECUTION_DURATION_MS =
  2 *
  measureExecutionDurationMs(() =>
    crossSpawnStub.sync(COFFEE_BIN, ['test/fixtures/scripts/exit-0.coffee']),
  );
const PORT = 61321;

let runner;
const logLevels = ['error', 'warn', 'debug'];

const HooksWorkerClient = proxyquire('../../lib/HooksWorkerClient', {
  'cross-spawn': crossSpawnStub,
  './which': whichStub,
  './logger': loggerStub,
}).default;

let hooksWorkerClient;

function loadWorkerClient(callback) {
  hooksWorkerClient = new HooksWorkerClient(runner);
  hooksWorkerClient.start((error) => callback(error));
}

describe('Hooks worker client', () => {
  let logs;

  beforeEach(() => {
    logs = [];
    runner = new TransactionRunner({});
    runner.hooks = new Hooks({ logs: [], logger: console });
    runner.hooks.configuration = {};

    Array.from(logLevels).forEach((level) =>
      sinon.stub(loggerStub, level).callsFake((msg1, msg2) => {
        let text = msg1;
        if (msg2) {
          text += ` ${msg2}`;
        }

        // Uncomment to enable logging for debug
        // console.log text
        logs.push(text);
      }),
    );
  });

  afterEach(() => {
    Array.from(logLevels).forEach((level) => loggerStub[level].restore());
  });

  describe('when methods dealing with connection to the handler are stubbed', () => {
    beforeEach(() => {
      sinon
        .stub(HooksWorkerClient.prototype, 'disconnectFromHandler')
        .callsFake(() => {});
      sinon
        .stub(HooksWorkerClient.prototype, 'connectToHandler')
        .callsFake((cb) => cb());
    });

    afterEach(() => {
      HooksWorkerClient.prototype.disconnectFromHandler.restore();
      HooksWorkerClient.prototype.connectToHandler.restore();
    });

    it('should pipe spawned process stdout to the Dredd process stdout', (done) => {
      runner.hooks.configuration.language = `${COFFEE_BIN} test/fixtures/scripts/stdout.coffee`;
      loadWorkerClient((workerError) => {
        if (workerError) {
          return done(workerError);
        }

        // The handler sometimes doesn't write to stdout or stderr until it
        // finishes, so we need to manually stop it. However, it could happen
        // before it actually manages to do what we test here, so we wait
        // until it writes some data into stdout
        hooksWorkerClient.handler.stdout.on('data', (data) => {
          if (data.toString() !== 'exiting\n') {
            process.nextTick(() => {
              hooksWorkerClient.stop((stopError) => {
                if (stopError) {
                  return done(stopError);
                }
                assert.include(
                  logs,
                  'Hooks handler stdout: standard output text\n',
                );
                done();
              });
            });
          }
        });
      });
    });

    it('should pipe spawned process stderr to the Dredd process stderr', (done) => {
      runner.hooks.configuration.language = `${COFFEE_BIN} test/fixtures/scripts/stderr.coffee`;
      loadWorkerClient((workerError) => {
        if (workerError) {
          return done(workerError);
        }

        // The handler sometimes doesn't write to stdout or stderr until it
        // finishes, so we need to manually stop it. However, it could happen
        // before it actually manages to do what we test here, so we wait
        // until it writes some data into stdout
        hooksWorkerClient.handler.stderr.on('data', (data) => {
          if (data.toString() !== 'exiting\n') {
            process.nextTick(() => {
              hooksWorkerClient.stop((stopError) => {
                if (stopError) {
                  return done(stopError);
                }
                assert.include(
                  logs,
                  'Hooks handler stderr: error output text\n',
                );
                done();
              });
            });
          }
        });
      });
    });

    it(
      'should not set the error on worker if process gets intentionally killed by Dredd ' +
        "because it can be killed after all hooks execution if SIGTERM isn't handled",
      (done) => {
        runner.hooks.configuration.language = `${COFFEE_BIN} test/fixtures/scripts/endless-ignore-term.coffee`;
        loadWorkerClient((workerError) => {
          if (workerError) {
            return done(workerError);
          }

          // The handler sometimes doesn't write to stdout or stderr until it
          // finishes, so we need to manually stop it. However, it could happen
          // we'll stop it before it actually manages to do what we test here, so
          // we add some timeout here.
          setTimeout(
            () =>
              hooksWorkerClient.stop((stopError) => {
                if (stopError) {
                  return done(stopError);
                }

                assert.isNull(runner.hookHandlerError);
                done();
              }),
            MIN_COMMAND_EXECUTION_DURATION_MS,
          );
        });
      },
    );

    it('should include the status in the error if spawned process ends with non-zero exit status', (done) => {
      runner.hooks.configuration.language =
        'node test/fixtures/scripts/exit-3.js';
      loadWorkerClient((workerError) => {
        if (workerError) {
          return done(workerError);
        }

        // The handler sometimes doesn't write to stdout or stderr until it
        // finishes, so we need to manually stop it. However, it could happen
        // we'll stop it before it actually manages to do what we test here, so
        // we add some timeout here.
        setTimeout(
          () =>
            hooksWorkerClient.stop((stopError) => {
              if (stopError) {
                return done(stopError);
              }
              assert.isOk(runner.hookHandlerError);
              assert.include(runner.hookHandlerError.message, '3');
              done();
            }),
          MIN_COMMAND_EXECUTION_DURATION_MS,
        );
      });
    });

    describe('when --language=nodejs option is given', () => {
      beforeEach(() => {
        runner.hooks.configuration = {
          language: 'nodejs',
        };
      });

      it('should write a hint that native hooks should be used', (done) =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'native Node.js hooks instead');
          done();
        }));
    });

    describe('when --language=ruby option is given and the worker is installed', () => {
      beforeEach(() => {
        sinon.stub(crossSpawnStub, 'spawn').callsFake(() => {
          const emitter = new EventEmitter();
          emitter.stdout = new EventEmitter();
          emitter.stderr = new EventEmitter();
          return emitter;
        });

        runner.hooks.configuration = {
          language: 'ruby',
          hookfiles: 'somefile.rb',
        };

        sinon.stub(whichStub, 'which').callsFake(() => true);
        sinon
          .stub(HooksWorkerClient.prototype, 'terminateHandler')
          .callsFake((callback) => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-ruby"', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[0],
              'dredd-hooks-ruby',
            );
            done();
          });
        }));

      it('should pass --hookfiles option as an array of arguments', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[1][0],
              'somefile.rb',
            );
            done();
          });
        }));
    });

    describe('when --language=ruby option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(() => false);

        runner.hooks.configuration = {
          language: 'ruby',
          hookfiles: 'somefile.rb',
        };
      });

      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', (done) =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'gem install dredd_hooks');
          done();
        }));
    });

    describe('when --language=python option is given and the worker is installed', () => {
      beforeEach(() => {
        sinon.stub(crossSpawnStub, 'spawn').callsFake(() => {
          const emitter = new EventEmitter();
          emitter.stdout = new EventEmitter();
          emitter.stderr = new EventEmitter();
          return emitter;
        });

        runner.hooks.configuration = {
          language: 'python',
          hookfiles: 'somefile.py',
        };

        sinon.stub(whichStub, 'which').callsFake(() => true);
        sinon
          .stub(HooksWorkerClient.prototype, 'terminateHandler')
          .callsFake((callback) => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-python"', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[0],
              'dredd-hooks-python',
            );
            done();
          });
        }));

      it('should pass --hookfiles option as an array of arguments', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[1][0],
              'somefile.py',
            );
            done();
          });
        }));
    });

    describe('when --language=python option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(() => false);

        runner.hooks.configuration = {
          language: 'python',
          hookfiles: 'somefile.py',
        };
      });

      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', (done) =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'pip install dredd_hooks');
          done();
        }));
    });

    describe('when --language=php option is given and the worker is installed', () => {
      beforeEach(() => {
        sinon.stub(crossSpawnStub, 'spawn').callsFake(() => {
          const emitter = new EventEmitter();
          emitter.stdout = new EventEmitter();
          emitter.stderr = new EventEmitter();
          return emitter;
        });

        runner.hooks.configuration = {
          language: 'php',
          hookfiles: 'somefile.py',
        };

        sinon.stub(whichStub, 'which').callsFake(() => true);
        sinon
          .stub(HooksWorkerClient.prototype, 'terminateHandler')
          .callsFake((callback) => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-php"', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[0],
              'dredd-hooks-php',
            );
            done();
          });
        }));

      it('should pass --hookfiles option as an array of arguments', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[1][0],
              'somefile.py',
            );
            done();
          });
        }));
    });

    describe('when --language=php option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(() => false);

        runner.hooks.configuration = {
          language: 'php',
          hookfiles: 'somefile.py',
        };
      });

      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', (done) =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(
            err.message,
            'composer require ddelnano/dredd-hooks-php --dev',
          );
          done();
        }));
    });

    describe('when --language=go option is given and the worker is not installed', () => {
      let goBin;
      let goPath;
      beforeEach(() => {
        goBin = process.env.GOBIN;
        goPath = process.env.GOPATH;
        process.env.GOBIN = '/dummy/gobin/path';
        delete process.env.GOPATH;

        sinon.stub(whichStub, 'which').callsFake(() => false);

        runner.hooks.configuration = {
          language: 'go',
          hookfiles: 'gobinary',
        };
      });
      afterEach(() => {
        whichStub.which.restore();
        process.env.GOBIN = goBin;
        process.env.GOPATH = goPath;
      });

      it('should write a hint how to install', (done) =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(
            err.message,
            'go get github.com/snikch/goodman/cmd/goodman',
          );
          done();
        }));
    });

    describe('when --language=go option is given and the worker is installed', () => {
      const dummyPath = path.join('dummy', 'gobin', 'path');
      let goBin;
      let goPath;
      beforeEach(() => {
        goBin = process.env.GOBIN;
        goPath = process.env.GOPATH;
        process.env.GOBIN = dummyPath;
        delete process.env.GOPATH;

        sinon.stub(crossSpawnStub, 'spawn').callsFake(() => {
          const emitter = new EventEmitter();
          emitter.stdout = new EventEmitter();
          emitter.stderr = new EventEmitter();
          return emitter;
        });

        runner.hooks.configuration = {
          language: 'go',
          hookfiles: 'gobinary',
        };

        sinon.stub(whichStub, 'which').callsFake(() => true);

        return sinon
          .stub(HooksWorkerClient.prototype, 'terminateHandler')
          .callsFake((callback) => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
        process.env.GOBIN = goBin;
        process.env.GOPATH = goPath;
      });

      it('should spawn the server process with command "$GOBIN/goodman"', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[0],
              path.join(dummyPath, 'goodman'),
            );
            done();
          });
        }));

      it('should pass --hookfiles option as an array of arguments', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[1][0],
              'gobinary',
            );
            done();
          });
        }));
    });

    describe('when --language=rust option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(() => false);

        runner.hooks.configuration = {
          language: 'rust',
          hookfiles: 'rustbinary',
        };
      });
      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', (done) =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'cargo install dredd-hooks');
          done();
        }));
    });

    describe('when --language=rust option is given and the worker is installed', () => {
      beforeEach(() => {
        sinon.stub(crossSpawnStub, 'spawn').callsFake(() => {
          const emitter = new EventEmitter();
          emitter.stdout = new EventEmitter();
          emitter.stderr = new EventEmitter();
          return emitter;
        });

        runner.hooks.configuration = {
          language: 'rust',
          hookfiles: 'rustbinary',
        };

        sinon.stub(whichStub, 'which').callsFake(() => true);
        sinon
          .stub(HooksWorkerClient.prototype, 'terminateHandler')
          .callsFake((callback) => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-rust"', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[0],
              'dredd-hooks-rust',
            );
            done();
          });
        }));

      it('should pass --hookfiles option as an array of arguments', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[1][0],
              'rustbinary',
            );
            done();
          });
        }));
    });

    describe('when --language=perl option is given and the worker is installed', () => {
      beforeEach(() => {
        sinon.stub(crossSpawnStub, 'spawn').callsFake(() => {
          const emitter = new EventEmitter();
          emitter.stdout = new EventEmitter();
          emitter.stderr = new EventEmitter();
          return emitter;
        });

        runner.hooks.configuration = {
          language: 'perl',
          hookfiles: 'somefile.py',
        };

        sinon.stub(whichStub, 'which').callsFake(() => true);
        sinon
          .stub(HooksWorkerClient.prototype, 'terminateHandler')
          .callsFake((callback) => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-perl"', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[0],
              'dredd-hooks-perl',
            );
            done();
          });
        }));

      it('should pass --hookfiles option as an array of arguments', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[1][0],
              'somefile.py',
            );
            done();
          });
        }));
    });

    describe('when --language=perl option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(() => false);

        runner.hooks.configuration = {
          language: 'perl',
          hookfiles: 'somefile.py',
        };
      });

      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', (done) =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'cpanm Dredd::Hooks');
          done();
        }));
    });

    describe('when --language=./any/other-command is given', () => {
      beforeEach(() => {
        sinon.stub(crossSpawnStub, 'spawn').callsFake(() => {
          const emitter = new EventEmitter();
          emitter.stdout = new EventEmitter();
          emitter.stderr = new EventEmitter();
          return emitter;
        });

        runner.hooks.configuration = {
          language: './my-fancy-command',
          hookfiles: 'someotherfile',
        };

        sinon
          .stub(HooksWorkerClient.prototype, 'terminateHandler')
          .callsFake((callback) => callback());
        sinon.stub(whichStub, 'which').callsFake(() => true);
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        HooksWorkerClient.prototype.terminateHandler.restore();
        whichStub.which.restore();
      });

      it('should spawn the server process with command "./my-fancy-command"', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[0],
              './my-fancy-command',
            );
            done();
          });
        }));

      it('should pass --hookfiles option as an array of arguments', (done) =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            assert.equal(
              crossSpawnStub.spawn.getCall(0).args[1][0],
              'someotherfile',
            );
            done();
          });
        }));
    });

    describe('after loading', () => {
      beforeEach((done) => {
        runner.hooks.configuration = {
          language: 'ruby',
          hookfiles: 'somefile.rb',
        };

        sinon
          .stub(HooksWorkerClient.prototype, 'spawnHandler')
          .callsFake((callback) => callback());

        sinon.stub(whichStub, 'which').callsFake(() => true);

        sinon
          .stub(HooksWorkerClient.prototype, 'terminateHandler')
          .callsFake((callback) => callback());

        loadWorkerClient((err) => {
          assert.isUndefined(err);

          hooksWorkerClient.stop((error) => {
            assert.isUndefined(error);
            done();
          });
        });
      });

      afterEach(() => {
        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
        HooksWorkerClient.prototype.spawnHandler.restore();
      });

      const eventTypes = [
        'beforeEach',
        'beforeEachValidation',
        'afterEach',
        'beforeAll',
        'afterAll',
      ];

      Array.from(eventTypes).forEach((eventType) => {
        it(`should register hook function for hook type ${eventType}`, () => {
          const hookFuncs = runner.hooks[`${eventType}Hooks`];
          assert.isAbove(hookFuncs.length, 0);
        });
      });
    });
  });

  describe('when hooks handler server is running and not modifying transactions', () => {
    let server;
    let receivedData = '';
    let transaction;
    let connected;
    let currentSocket;
    let sentData = '';

    beforeEach(() => {
      receivedData = '';
      transaction = { key: 'value' };

      server = net.createServer();
      server.on('connection', (socket) => {
        currentSocket = socket;
        connected = true;
        socket.on('data', (data) => {
          receivedData += data.toString();

          const receivedObject = JSON.parse(receivedData.replace('\n', ''));
          const objectToSend = clone(receivedObject);
          const message = `${JSON.stringify(objectToSend)}\n`;

          currentSocket.write(message);
        });
      });

      server.listen(PORT);
    });

    afterEach(() => server.close());

    it('should connect to the server', (done) => {
      runner.hooks.configuration.language = `${COFFEE_BIN} test/fixtures/scripts/exit-0.coffee`;

      loadWorkerClient((err) => {
        assert.isUndefined(err);

        hooksWorkerClient.stop((error) => {
          assert.isTrue(connected);
          assert.isUndefined(error);
          done();
        });
      });
    });

    const eventTypes = [
      'beforeEach',
      'beforeEachValidation',
      'afterEach',
      'beforeAll',
      'afterAll',
    ];

    Array.from(eventTypes).forEach((eventType) => {
      describe(`when '${eventType}' hook function is triggered`, () => {
        if (eventType.indexOf('All') > -1) {
          beforeEach((done) => {
            receivedData = '';
            runner.hooks.configuration.language = `${COFFEE_BIN} test/fixtures/scripts/exit-0.coffee`;
            sentData = clone([transaction]);
            loadWorkerClient((err) => {
              assert.isUndefined(err);
              runner.hooks[`${eventType}Hooks`][0](sentData, () => done());
            });
          });
        } else {
          beforeEach((done) => {
            receivedData = '';
            runner.hooks.configuration.language = `${COFFEE_BIN} test/fixtures/scripts/exit-0.coffee`;
            sentData = clone(transaction);
            loadWorkerClient((err) => {
              assert.isUndefined(err);
              runner.hooks[`${eventType}Hooks`][0](sentData, () => done());
            });
          });
        }

        afterEach((done) => hooksWorkerClient.stop(done));

        it('should send JSON to the socket ending with delimiter character', (done) => {
          assert.include(receivedData, '\n');
          assert.include(receivedData, '{');
          done();
        });

        describe('sent object', () => {
          let receivedObject;

          beforeEach(() => {
            receivedObject = JSON.parse(receivedData.replace('\n', ''));
          });

          const keys = ['data', 'event', 'uuid'];

          Array.from(keys).forEach((key) => {
            it(`should contain key ${key}`, () => {
              assert.property(receivedObject, key);
            });
          });

          it(`key event should have value ${eventType}`, () =>
            assert.equal(receivedObject.event, eventType));

          if (eventType.indexOf('All') > -1) {
            it('key data should contain array of transaction objects', () => {
              assert.isArray(receivedObject.data);
              assert.propertyVal(receivedObject.data[0], 'key', 'value');
            });
          } else {
            it('key data should contain the transaction object', () => {
              assert.isObject(receivedObject.data);
              assert.propertyVal(receivedObject.data, 'key', 'value');
            });
          }
        });
      });
    });
  });

  describe('when hooks handler server is running and modifying transactions', () => {
    let transaction = {
      name: 'API > Hello > World',
      request: {
        method: 'POST',
        uri: '/message',
        headers: {},
        body: 'Hello World!',
      },
    };

    return [
      'beforeAll',
      'beforeEach',
      'beforeEachValidation',
      'afterEach',
      'afterAll',
    ].forEach((eventName) => {
      let getFirstTransaction;
      let transactionData;
      if (eventName.match(/All$/)) {
        // the hooks which are called '*All' recieve an array of transactions
        // as a parameter
        transactionData = clone([transaction]);
        // eslint-disable-next-line
        getFirstTransaction = (transactionData) => transactionData[0];
      } else {
        // all the other hooks recieve a single transaction as a parameter
        transactionData = clone(transaction);
        // eslint-disable-next-line
        getFirstTransaction = (transactionData) => transactionData;
      }

      describe(`when '${eventName}' function is triggered and the hooks handler replies`, () => {
        let hookHandler;

        beforeEach((done) => {
          // Dummy placeholder for a real hooks handler
          runner.hooks.configuration.language = `${COFFEE_BIN} test/fixtures/scripts/exit-0.coffee`;

          // Mock hooks handler implementation, which ocuppies expected port instead
          // of a real hooks handler.
          hookHandler = net.createServer();
          hookHandler.on('connection', (socket) => {
            // -- 3 --, recieving transaction(s) from hooks worker client
            let bufferedData = '';
            return socket.on('data', (data) => {
              // We're buffering data here into a string, until...
              bufferedData += data.toString();

              // -- 4 --, ...until there's a message separator (new line), which
              // means we've got one complete message in our buffer
              if (Array.from(bufferedData).includes('\n')) {
                const messageIn = JSON.parse(bufferedData);

                // once the hooks worker client finishes processing of data it
                // got back from the hooks handler, it triggers this event
                hooksWorkerClient.emitter.on(messageIn.uuid, () => {
                  // -- 7 --
                  done();
                });

                // -- 5 --, modifying the transaction
                transaction = getFirstTransaction(messageIn.data);
                transaction.request.uri += '?param=value';

                // -- 6 --, sending modified data back to hooks worker client
                const messageOut = `${JSON.stringify(messageIn)}\n`;
                socket.write(messageOut);
              }
            });
          });

          // -- 1 --, starts the mock hooks handler
          hookHandler.listen(PORT);

          // -- 2 --, runs hooks worker client, starts to send transaction(s),
          // thus triggers the 'connection' event above
          loadWorkerClient((err) => {
            if (err) {
              return done(err);
            }
            runner.hooks[`${eventName}Hooks`][0](transactionData, () => {});
          });
        });
        afterEach((done) => {
          hookHandler.close();
          hooksWorkerClient.stop(done);
        });

        it('modifications get applied to the original transaction object', () => {
          transaction = getFirstTransaction(transactionData);
          assert.equal(transaction.request.uri, '/message?param=value');
        });
      });
    });
  });

  describe("'hooks-worker-*' configuration options", () => {
    const scenarios = [
      {
        property: 'timeout',
        option: 'hooks-worker-timeout',
      },
      {
        property: 'connectTimeout',
        option: 'hooks-worker-connect-timeout',
      },
      {
        property: 'connectRetry',
        option: 'hooks-worker-connect-retry',
      },
      {
        property: 'afterConnectWait',
        option: 'hooks-worker-after-connect-wait',
      },
      {
        property: 'termTimeout',
        option: 'hooks-worker-term-timeout',
      },
      {
        property: 'termRetry',
        option: 'hooks-worker-term-retry',
      },
      {
        property: 'handlerHost',
        option: 'hooks-worker-handler-host',
      },
      {
        property: 'handlerPort',
        option: 'hooks-worker-handler-port',
      },
    ];

    Array.from(scenarios).forEach((scenario) => {
      describe(`Option '${scenario.option}'`, () => {
        const defaultValue = commandLineOptions[scenario.option].default;
        const changedValue = defaultValue + 42;

        it(`is set to ${defaultValue} by default`, () => {
          hooksWorkerClient = new HooksWorkerClient(runner);
          assert.equal(hooksWorkerClient[scenario.property], defaultValue);
        });

        it('can be set to a different value', () => {
          runner.hooks.configuration[scenario.option] = changedValue;
          hooksWorkerClient = new HooksWorkerClient(runner);
          assert.equal(hooksWorkerClient[scenario.property], changedValue);
        });
      });
    });
  });
});
