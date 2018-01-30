/* eslint-disable
    no-loop-func,
    no-return-assign,
    no-shadow,
    no-undef,
    no-unused-vars,
    one-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const proxyquire = require('proxyquire');
const { EventEmitter } = require('events');
const sinon = require('sinon');
const net = require('net');
const { assert } = require('chai');
const clone = require('clone');
const childProcess = require('child_process');

const crossSpawnStub = require('cross-spawn');
const whichStub = require('../../src/which');
const loggerStub = require('../../src/logger');

const Hooks = require('../../src/hooks');
const commandLineOptions = require('../../src/options');

const measureExecutionDurationMs = function (fn) {
  const time = process.hrtime();
  fn();
  const timeDiff = process.hrtime(time); // timeDiff = [seconds, nanoseconds]
  return ((timeDiff[0] * 1000) + (timeDiff[1] * 1e-6));
};

const COFFEE_BIN = 'node_modules/.bin/coffee';
const MIN_COMMAND_EXECUTION_DURATION_MS = 2 * measureExecutionDurationMs(() => crossSpawnStub.sync(COFFEE_BIN, ['test/fixtures/scripts/exit-0.coffee']));
const PORT = 61321;

let runner = null;
let logs = null;
const logLevels = ['error', 'log', 'info', 'warn'];

const HooksWorkerClient = proxyquire('../../src/hooks-worker-client', {
  'cross-spawn': crossSpawnStub,
  './which': whichStub,
  './logger': loggerStub
}
);

const TransactionRunner = require('../../src/transaction-runner');

let hooksWorkerClient = null;

const loadWorkerClient = function (callback) {
  hooksWorkerClient = new HooksWorkerClient(runner);
  return hooksWorkerClient.start(error => callback(error));
};

describe('Hooks worker client', () => {
  beforeEach(() => {
    logs = [];

    runner = new TransactionRunner({});
    runner.hooks = new Hooks({ logs: [], logger: console });
    runner.hooks.configuration = { options: {} };

    return Array.from(logLevels).map(level =>
      sinon.stub(loggerStub, level).callsFake((msg1, msg2) => {
        let text = msg1;
        if (msg2) { text += ` ${msg2}`; }

        // Uncomment to enable logging for debug
        // console.log text
        return logs.push(text);
      }));
  });

  afterEach(() =>
    Array.from(logLevels).map(level =>
      loggerStub[level].restore())
  );

  describe('when methods dealing with connection to the handler are stubbed', () => {
    beforeEach(() => {
      sinon.stub(HooksWorkerClient.prototype, 'disconnectFromHandler').callsFake(() => { });
      return sinon.stub(HooksWorkerClient.prototype, 'connectToHandler').callsFake(cb => cb());
    });

    afterEach(() => {
      HooksWorkerClient.prototype.disconnectFromHandler.restore();
      return HooksWorkerClient.prototype.connectToHandler.restore();
    });

    it('should pipe spawned process stdout to the Dredd process stdout', (done) => {
      runner.hooks.configuration.options.language = `${COFFEE_BIN} test/fixtures/scripts/stdout.coffee`;
      return loadWorkerClient((workerError) => {
        if (workerError) { return done(workerError); }

        // The handler sometimes doesn't write to stdout or stderr until it
        // finishes, so we need to manually stop it. However, it could happen
        // we'll stop it before it actually manages to do what we test here, so
        // we add some timeout here.
        return setTimeout(() =>
          hooksWorkerClient.stop((stopError) => {
            if (stopError) { return done(stopError); }
            assert.include(logs, 'Hooks handler stdout: standard output text\n');
            return done();
          })

          , MIN_COMMAND_EXECUTION_DURATION_MS);
      });
    });

    it('should pipe spawned process stderr to the Dredd process stderr', (done) => {
      runner.hooks.configuration.options.language = `${COFFEE_BIN} test/fixtures/scripts/stderr.coffee`;
      return loadWorkerClient((workerError) => {
        if (workerError) { return done(workerError); }

        // The handler sometimes doesn't write to stdout or stderr until it
        // finishes, so we need to manually stop it. However, it could happen
        // we'll stop it before it actually manages to do what we test here, so
        // we add some timeout here.
        return setTimeout(() =>
          hooksWorkerClient.stop((stopError) => {
            if (stopError) { return done(stopError); }
            assert.include(logs, 'Hooks handler stderr: error output text\n');
            return done();
          })

          , MIN_COMMAND_EXECUTION_DURATION_MS);
      });
    });

    it('should not set the error on worker if process gets intentionally killed by Dredd ' +
    'because it can be killed after all hooks execution if SIGTERM isn\'t handled', (done) => {
      runner.hooks.configuration.options.language = `${COFFEE_BIN} test/fixtures/scripts/endless-ignore-term.coffee`;
      return loadWorkerClient((workerError) => {
        if (workerError) { return done(workerError); }

        // The handler sometimes doesn't write to stdout or stderr until it
        // finishes, so we need to manually stop it. However, it could happen
        // we'll stop it before it actually manages to do what we test here, so
        // we add some timeout here.
        return setTimeout(() =>
          hooksWorkerClient.stop((stopError) => {
            if (stopError) { return done(stopError); }
            assert.isNull(runner.hookHandlerError);
            return done();
          })

          , MIN_COMMAND_EXECUTION_DURATION_MS);
      });
    });

    it('should include the status in the error if spawned process ends with non-zero exit status', (done) => {
      runner.hooks.configuration.options.language = `${COFFEE_BIN} test/fixtures/scripts/exit-3.coffee`;
      return loadWorkerClient((workerError) => {
        if (workerError) { return done(workerError); }

        // The handler sometimes doesn't write to stdout or stderr until it
        // finishes, so we need to manually stop it. However, it could happen
        // we'll stop it before it actually manages to do what we test here, so
        // we add some timeout here.
        return setTimeout(() =>
          hooksWorkerClient.stop((stopError) => {
            if (stopError) { return done(stopError); }
            assert.isOk(runner.hookHandlerError);
            assert.include(runner.hookHandlerError.message, '3');
            return done();
          })

          , MIN_COMMAND_EXECUTION_DURATION_MS);
      });
    });

    describe('when --language=nodejs option is given', () => {
      beforeEach(() =>
        runner.hooks.configuration = {
          options: {
            language: 'nodejs'
          }
        }
      );

      it('should write a hint that native hooks should be used', done =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'native Node.js hooks instead');
          return done();
        })
      );
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
          options: {
            language: 'ruby',
            hookfiles: 'somefile.rb'
          }
        };

        sinon.stub(whichStub, 'which').callsFake(command => true);

        return sinon.stub(HooksWorkerClient.prototype, 'terminateHandler').callsFake(callback => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        return HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-ruby"', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-ruby');
            return done();
          });
        })
      );

      it('should pass --hookfiles option as an array of arguments', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[1][0], 'somefile.rb');
            return done();
          });
        })
      );
    });

    describe('when --language=ruby option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(command => false);

        return runner.hooks.configuration = {
          options: {
            language: 'ruby',
            hookfiles: 'somefile.rb'
          }
        };
      });

      afterEach(() => whichStub.which.restore());


      it('should write a hint how to install', done =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'gem install dredd_hooks');
          return done();
        })
      );
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
          options: {
            language: 'python',
            hookfiles: 'somefile.py'
          }
        };

        sinon.stub(whichStub, 'which').callsFake(command => true);

        return sinon.stub(HooksWorkerClient.prototype, 'terminateHandler').callsFake(callback => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        return HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-python"', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-python');
            return done();
          });
        })
      );

      it('should pass --hookfiles option as an array of arguments', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[1][0], 'somefile.py');
            return done();
          });
        })
      );
    });

    describe('when --language=python option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(command => false);

        return runner.hooks.configuration = {
          options: {
            language: 'python',
            hookfiles: 'somefile.py'
          }
        };
      });

      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', done =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'pip install dredd_hooks');
          return done();
        })
      );
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
          options: {
            language: 'php',
            hookfiles: 'somefile.py'
          }
        };

        sinon.stub(whichStub, 'which').callsFake(command => true);

        return sinon.stub(HooksWorkerClient.prototype, 'terminateHandler').callsFake(callback => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        return HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-php"', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-php');
            return done();
          });
        })
      );

      it('should pass --hookfiles option as an array of arguments', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[1][0], 'somefile.py');
            return done();
          });
        })
      );
    });

    describe('when --language=php option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(command => false);

        return runner.hooks.configuration = {
          options: {
            language: 'php',
            hookfiles: 'somefile.py'
          }
        };
      });

      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', done =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'composer require ddelnano/dredd-hooks-php --dev');
          return done();
        })
      );
    });

    describe('when --language=go option is given and the worker is not installed', () => {
      let goBin;
      let goPath;
      beforeEach(() => {
        goBin = process.env.GOBIN;
        goPath = process.env.GOPATH;
        process.env.GOBIN = '/dummy/gobin/path';
        delete process.env.GOPATH;

        sinon.stub(whichStub, 'which').callsFake(command => false);

        return runner.hooks.configuration = {
          options: {
            language: 'go',
            hookfiles: 'gobinary'
          }
        };
      });
      afterEach(() => {
        whichStub.which.restore();
        process.env.GOBIN = goBin;
        return process.env.GOPATH = goPath;
      });

      it('should write a hint how to install', done =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'go get github.com/snikch/goodman/cmd/goodman');
          return done();
        })
      );
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
          options: {
            language: 'go',
            hookfiles: 'gobinary'
          }
        };

        sinon.stub(whichStub, 'which').callsFake(command => true);

        return sinon.stub(HooksWorkerClient.prototype, 'terminateHandler').callsFake(callback => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
        process.env.GOBIN = goBin;
        return process.env.GOPATH = goPath;
      });

      it('should spawn the server process with command "$GOBIN/goodman"', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[0], path.join(dummyPath, 'goodman'));
            return done();
          });
        })
      );

      it('should pass --hookfiles option as an array of arguments', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[1][0], 'gobinary');
            return done();
          });
        })
      );
    });

    describe('when --language=rust option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(command => false);

        return runner.hooks.configuration = {
          options: {
            language: 'rust',
            hookfiles: 'rustbinary'
          }
        };
      });
      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', done =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'cargo install dredd-hooks');
          return done();
        })
      );
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
          options: {
            language: 'rust',
            hookfiles: 'rustbinary'
          }
        };

        sinon.stub(whichStub, 'which').callsFake(command => true);

        return sinon.stub(HooksWorkerClient.prototype, 'terminateHandler').callsFake(callback => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        return HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-rust"', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-rust');
            return done();
          });
        })
      );

      it('should pass --hookfiles option as an array of arguments', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[1][0], 'rustbinary');
            return done();
          });
        })
      );
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
          options: {
            language: 'perl',
            hookfiles: 'somefile.py'
          }
        };

        sinon.stub(whichStub, 'which').callsFake(command => true);

        return sinon.stub(HooksWorkerClient.prototype, 'terminateHandler').callsFake(callback => callback());
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        return HooksWorkerClient.prototype.terminateHandler.restore();
      });

      it('should spawn the server process with command "dredd-hooks-perl"', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[0], 'dredd-hooks-perl');
            return done();
          });
        })
      );

      it('should pass --hookfiles option as an array of arguments', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[1][0], 'somefile.py');
            return done();
          });
        })
      );
    });

    describe('when --language=perl option is given and the worker is not installed', () => {
      beforeEach(() => {
        sinon.stub(whichStub, 'which').callsFake(command => false);

        return runner.hooks.configuration = {
          options: {
            language: 'perl',
            hookfiles: 'somefile.py'
          }
        };
      });

      afterEach(() => whichStub.which.restore());

      it('should write a hint how to install', done =>
        loadWorkerClient((err) => {
          assert.isOk(err);
          assert.include(err.message, 'cpanm Dredd::Hooks');
          return done();
        })
      );
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
          options: {
            language: './my-fancy-command',
            hookfiles: 'someotherfile'
          }
        };

        sinon.stub(HooksWorkerClient.prototype, 'terminateHandler').callsFake(callback => callback());

        return sinon.stub(whichStub, 'which').callsFake(() => true);
      });

      afterEach(() => {
        crossSpawnStub.spawn.restore();

        runner.hooks.configuration = undefined;

        HooksWorkerClient.prototype.terminateHandler.restore();
        return whichStub.which.restore();
      });

      it('should spawn the server process with command "./my-fancy-command"', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.isTrue(crossSpawnStub.spawn.called);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[0], './my-fancy-command');
            return done();
          });
        })
      );

      it('should pass --hookfiles option as an array of arguments', done =>
        loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            assert.equal(crossSpawnStub.spawn.getCall(0).args[1][0], 'someotherfile');
            return done();
          });
        })
      );
    });

    describe('after loading', () => {
      beforeEach((done) => {
        runner.hooks.configuration = {
          options: {
            language: 'ruby',
            hookfiles: 'somefile.rb'
          }
        };

        sinon.stub(HooksWorkerClient.prototype, 'spawnHandler').callsFake(callback => callback());

        sinon.stub(whichStub, 'which').callsFake(command => true);

        sinon.stub(HooksWorkerClient.prototype, 'terminateHandler').callsFake(callback => callback());


        return loadWorkerClient((err) => {
          assert.isUndefined(err);

          return hooksWorkerClient.stop((err) => {
            assert.isUndefined(err);
            return done();
          });
        });
      });


      afterEach(() => {
        runner.hooks.configuration = undefined;

        whichStub.which.restore();
        HooksWorkerClient.prototype.terminateHandler.restore();
        return HooksWorkerClient.prototype.spawnHandler.restore();
      });

      const eventTypes = [
        'beforeEach',
        'beforeEachValidation',
        'afterEach',
        'beforeAll',
        'afterAll'
      ];

      return Array.from(eventTypes).map(eventType => (eventType =>
        it(`should register hook function for hook type ${eventType}`, () => {
          const hookFuncs = runner.hooks[`${eventType}Hooks`];
          assert.isAbove(hookFuncs.length, 0);
        })
      )(eventType));
    });
  });

  describe('when hook handler server is running and not modifying transactions', () => {
    let server = null;
    let receivedData = '';
    let transaction = null;
    let connected = null;
    let currentSocket = null;
    let sentData = '';

    beforeEach(() => {
      receivedData = '';

      transaction =
        { key: 'value' };

      server = net.createServer();
      server.on('connection', (socket) => {
        currentSocket = socket;
        connected = true;
        return socket.on('data', (data) => {
          receivedData += data.toString();

          const receivedObject = JSON.parse(receivedData.replace('\n', ''));
          const objectToSend = clone(receivedObject);
          const message = `${JSON.stringify(objectToSend)}\n`;

          return currentSocket.write(message);
        });
      });

      return server.listen(PORT);
    });

    afterEach(() => server.close());


    it('should connect to the server', (done) => {
      runner.hooks.configuration.options.language = `${COFFEE_BIN} test/fixtures/scripts/exit-0.coffee`;

      return loadWorkerClient((err) => {
        assert.isUndefined(err);

        return hooksWorkerClient.stop((err) => {
          assert.isTrue(connected);
          assert.isUndefined(err);
          return done();
        });
      });
    });

    const eventTypes = [
      'beforeEach',
      'beforeEachValidation',
      'afterEach',
      'beforeAll',
      'afterAll'
    ];

    return Array.from(eventTypes).map(eventType => (eventType =>
      describe(`when '${eventType}' hook function is triggered`, () => {
        if (eventType.indexOf('All') > -1) {
          beforeEach((done) => {
            receivedData = '';
            runner.hooks.configuration.options.language = `${COFFEE_BIN} test/fixtures/scripts/exit-0.coffee`;
            sentData = clone([transaction]);
            return loadWorkerClient((err) => {
              assert.isUndefined(err);
              return runner.hooks[`${eventType}Hooks`][0](sentData, () => done());
            });
          });
        } else {
          beforeEach((done) => {
            receivedData = '';
            runner.hooks.configuration.options.language = `${COFFEE_BIN} test/fixtures/scripts/exit-0.coffee`;
            sentData = clone(transaction);
            return loadWorkerClient((err) => {
              assert.isUndefined(err);
              return runner.hooks[`${eventType}Hooks`][0](sentData, () => done());
            });
          });
        }

        afterEach(done => hooksWorkerClient.stop(done));

        it('should send JSON to the socket ending with delimiter character', (done) => {
          assert.include(receivedData, '\n');
          assert.include(receivedData, '{');
          return done();
        });


        describe('sent object', () => {
          let receivedObject = null;

          beforeEach(() => receivedObject = JSON.parse(receivedData.replace('\n', '')));

          const keys = [
            'data',
            'event',
            'uuid'
          ];

          for (const key of keys) {
            (key =>
              it(`should contain key ${key}`, () => assert.property(receivedObject, key))
            )(key);
          }

          it(`key event should have value ${eventType}`, () => assert.equal(receivedObject.event, eventType));

          if (eventType.indexOf('All') > -1) {
            it('key data should contain array of transaction objects', () => {
              assert.isArray(receivedObject.data);
              assert.propertyVal(receivedObject.data[0], 'key', 'value');
            });
          }
          it('key data should contain the transaction object', () => {
            assert.isObject(receivedObject.data);
            assert.propertyVal(receivedObject.data, 'key', 'value');
          });
        });
      })
    )(eventType));
  });

  describe('when hook handler server is running and modifying transactions', () => {
    let transaction = {
      name: 'API > Hello > World',
      request: { method: 'POST', uri: '/message', headers: {}, body: 'Hello World!' }
    };

    return [
      'beforeAll',
      'beforeEach',
      'beforeEachValidation',
      'afterEach',
      'afterAll'
    ].forEach((eventName) => {
      let getFirstTransaction,
        transactionData;
      if (eventName.match(/All$/)) {
        // the hooks which are called '*All' recieve an array of transactions
        // as a parameter
        transactionData = clone([transaction]);
        getFirstTransaction = transactionData => transactionData[0];
      } else {
        // all the other hooks recieve a single transaction as a parameter
        transactionData = clone(transaction);
        getFirstTransaction = transactionData => transactionData;
      }

      describe(`when '${eventName}' function is triggered and the hook handler replies`, () => {
        let hookHandler;

        beforeEach((done) => {
          // Dummy placeholder for a real hook handler
          runner.hooks.configuration.options.language = `${COFFEE_BIN} test/fixtures/scripts/exit-0.coffee`;

          // Mock hook handler implementation, which ocuppies expected port instead
          // of a real hook handler.
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
                // got back from the hook handler, it triggers this event
                hooksWorkerClient.emitter.on(messageIn.uuid, () =>
                  // -- 7 --
                  done()
                );

                // -- 5 --, modifying the transaction
                transaction = getFirstTransaction(messageIn.data);
                transaction.request.uri += '?param=value';

                // -- 6 --, sending modified data back to hooks worker client
                const messageOut = `${JSON.stringify(messageIn)}\n`;
                return socket.write(messageOut);
              }
            });
          });

          // -- 1 --, starts the mock hook handler
          hookHandler.listen(PORT);

          // -- 2 --, runs hooks worker client, starts to send transaction(s),
          // thus triggers the 'connection' event above
          return loadWorkerClient((err) => {
            if (err) { return done(err); }
            return runner.hooks[`${eventName}Hooks`][0](transactionData, () => {});
          });
        });
        afterEach((done) => {
          hookHandler.close();
          return hooksWorkerClient.stop(done);
        });

        it('modifications get applied to the original transaction object', () => {
          transaction = getFirstTransaction(transactionData);
          assert.equal(transaction.request.uri, '/message?param=value');
        });
      });
    });
  });

  describe("'hooks-worker-*' configuration options", () => {
    const scenarios = [{
      property: 'timeout',
      option: 'hooks-worker-timeout'
    },
    {
      property: 'connectTimeout',
      option: 'hooks-worker-connect-timeout'
    },
    {
      property: 'connectRetry',
      option: 'hooks-worker-connect-retry'
    },
    {
      property: 'afterConnectWait',
      option: 'hooks-worker-after-connect-wait'
    },
    {
      property: 'termTimeout',
      option: 'hooks-worker-term-timeout'
    },
    {
      property: 'termRetry',
      option: 'hooks-worker-term-retry'
    },
    {
      property: 'handlerHost',
      option: 'hooks-worker-handler-host'
    },
    {
      property: 'handlerPort',
      option: 'hooks-worker-handler-port'
    }
    ];

    return Array.from(scenarios).map(scenario =>
      (scenario =>
        describe(`Option '${scenario.option}'`, () => {
          const defaultValue = commandLineOptions[scenario.option].default;
          const changedValue = defaultValue + 42;

          it(`is set to ${defaultValue} by default`, () => {
            hooksWorkerClient = new HooksWorkerClient(runner);
            assert.equal(hooksWorkerClient[scenario.property], defaultValue);
          });

          it('can be set to a different value', () => {
            runner.hooks.configuration.options[scenario.option] = changedValue;
            hooksWorkerClient = new HooksWorkerClient(runner);
            assert.equal(hooksWorkerClient[scenario.property], changedValue);
          });
        })
      )(scenario));
  });
});
