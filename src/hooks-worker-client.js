const net = require('net');
const path = require('path');
const {EventEmitter} = require('events');
const spawnArgs = require('spawn-args');
const generateUuid = require('uuid').v4;

const {spawn} = require('./child-process');
const logger = require('./logger');
const which = require('./which');
const getGoBin = require('./get-go-bin');


class HooksWorkerClient {
  constructor(runner) {
    this.runner = runner;
    const { options } = this.runner.hooks.configuration;
    this.language = options.language;
    this.timeout = options['hooks-worker-timeout'] || 5000;
    this.connectTimeout = options['hooks-worker-connect-timeout'] || 1500;
    this.connectRetry = options['hooks-worker-connect-retry'] || 500;
    this.afterConnectWait = options['hooks-worker-after-connect-wait'] || 100;
    this.termTimeout = options['hooks-worker-term-timeout'] || 5000;
    this.termRetry = options['hooks-worker-term-retry'] || 500;
    this.handlerHost = options['hooks-worker-handler-host'] || '127.0.0.1';
    this.handlerPort = options['hooks-worker-handler-port'] || 61321;
    this.handlerMessageDelimiter = '\n';
    this.clientConnected = false;
    this.connectError = false;
    this.emitter = new EventEmitter;
  }

  start(callback) {
    logger.verbose('Looking up hooks handler implementation:', this.language);
    return this.setCommandAndCheckForExecutables(executablesError => {
      if (executablesError) { return callback(executablesError); }

      logger.verbose('Starting hooks handler.');
      return this.spawnHandler(spawnHandlerError => {
        if (spawnHandlerError) { return callback(spawnHandlerError); }

        logger.verbose('Connecting to hooks handler.');
        return this.connectToHandler(connectHandlerError => {
          if (connectHandlerError) { return callback(connectHandlerError); }

          logger.verbose('Registering hooks.');
          return this.registerHooks(function(registerHooksError) {
            if (registerHooksError) { return callback(registerHooksError); }
            return callback();
          });
        });
      });
    });
  }

  stop(callback) {
    this.disconnectFromHandler();
    return this.terminateHandler(callback);
  }

  terminateHandler(callback) {
    logger.verbose('Terminating hooks handler process, PID', this.handler.pid);
    if (this.handler.terminated) {
      logger.debug('The hooks handler process has already terminated');
      return callback();
    }

    this.handler.terminate({force: true, timeout: this.termTimeout, retryDelay: this.termRetry});
    return this.handler.on('close', () => callback());
  }

  disconnectFromHandler() {
    return this.handlerClient.destroy();
  }

  setCommandAndCheckForExecutables(callback) {
    // Select handler based on option, use option string as command if not match anything
    let msg;
    if (this.language === 'ruby') {
      this.handlerCommand = 'dredd-hooks-ruby';
      this.handlerCommandArgs = [];
      if (!which.which(this.handlerCommand)) {
        msg = `\
Ruby hooks handler command not found: ${this.handlerCommand}
Install ruby hooks handler by running:
$ gem install dredd_hooks\
`;
        return callback(new Error(msg));
      } else {
        return callback();
      }

    } else if (this.language === 'rust') {
      this.handlerCommand = 'dredd-hooks-rust';
      this.handlerCommandArgs = [];
      if (!which.which(this.handlerCommand)) {
        msg = `\
Rust hooks handler command not found: ${this.handlerCommand}
Install rust hooks handler by running:
$ cargo install dredd-hooks\
`;
        return callback(new Error(msg));
      } else {
        return callback();
      }

    } else if (this.language === 'python') {
      this.handlerCommand = 'dredd-hooks-python';
      this.handlerCommandArgs = [];
      if (!which.which(this.handlerCommand)) {
        msg = `\
Python hooks handler command not found: ${this.handlerCommand}
Install python hooks handler by running:
$ pip install dredd_hooks\
`;
        return callback(new Error(msg));
      } else {
        return callback();
      }

    } else if (this.language === 'php') {
      this.handlerCommand = 'dredd-hooks-php';
      this.handlerCommandArgs = [];
      if (!which.which(this.handlerCommand)) {
        msg = `\
PHP hooks handler command not found: ${this.handlerCommand}
Install php hooks handler by running:
$ composer require ddelnano/dredd-hooks-php --dev\
`;
        return callback(new Error(msg));
      } else {
        return callback();
      }

    } else if (this.language === 'perl') {
      this.handlerCommand = 'dredd-hooks-perl';
      this.handlerCommandArgs = [];
      if (!which.which(this.handlerCommand)) {
        msg = `\
Perl hooks handler command not found: ${this.handlerCommand}
Install perl hooks handler by running:
$ cpanm Dredd::Hooks\
`;
        return callback(new Error(msg));
      } else {
        return callback();
      }

    } else if (this.language === 'nodejs') {
      msg = `\
Hooks handler should not be used for Node.js. \
Use Dredd's native Node.js hooks instead.\
`;
      return callback(new Error(msg));

    } else if (this.language === 'go') {
      return getGoBin((err, goBin) => {
        if (err) {
          return callback(new Error(`Go doesn't seem to be installed: ${err.message}`));
        } else {
          this.handlerCommand = path.join(goBin, 'goodman');
          this.handlerCommandArgs = [];
          if (which.which(this.handlerCommand)) {
            return callback();
          } else {
            msg = `\
Go hooks handler command not found: ${this.handlerCommand}
Install go hooks handler by running:
$ go get github.com/snikch/goodman/cmd/goodman\
`;
            return callback(new Error(msg));
          }
        }
      });
    } else {
      const parsedArgs = spawnArgs(this.language);
      this.handlerCommand = parsedArgs.shift();
      this.handlerCommandArgs = parsedArgs;

      logger.verbose(`Using '${this.handlerCommand}' as a hook handler command, '${this.handlerCommandArgs.join(' ')}' as arguments`);
      if (!which.which(this.handlerCommand)) {
        msg = `Hooks handler command not found: ${this.handlerCommand}`;
        return callback(new Error(msg));
      } else {
        return callback();
      }
    }
  }

  spawnHandler(callback) {
    const pathGlobs = [].concat(__guard__(__guard__(this.runner.hooks != null ? this.runner.hooks.configuration : undefined, x1 => x1.options), x => x.hookfiles));
    const handlerCommandArgs = this.handlerCommandArgs.concat(pathGlobs);

    logger.info(`Spawning '${this.language}' hooks handler process.`);
    this.handler = spawn(this.handlerCommand, handlerCommandArgs);

    this.handler.stdout.on('data', data => logger.info("Hooks handler stdout:", data.toString()));
    this.handler.stderr.on('data', data => logger.info("Hooks handler stderr:", data.toString()));

    this.handler.on('signalTerm', () => logger.verbose('Gracefully terminating the hooks handler process'));
    this.handler.on('signalKill', () => logger.verbose('Killing the hooks handler process'));

    this.handler.on('crash', (exitStatus, killed) => {
      let msg;
      if (killed) {
        msg = `Hooks handler process '${this.handlerCommand} ${handlerCommandArgs.join(' ')}' was killed.`;
      } else {
        msg = `Hooks handler process '${this.handlerCommand} ${handlerCommandArgs.join(' ')}' exited with status: ${exitStatus}`;
      }
      logger.error(msg);
      return this.runner.hookHandlerError = new Error(msg);
    });
    this.handler.on('error', err => {
      return this.runner.hookHandlerError = err;
    });
    return callback();
  }

  connectToHandler(callback) {
    let timeout;
    const start = Date.now();
    var waitForConnect = () => {
      if ((Date.now() - start) < this.connectTimeout) {
        clearTimeout(timeout);

        if (this.connectError !== false) {
          logger.warn('Error connecting to the hooks handler process. Is the handler running? Retrying.');
          this.connectError = false;
        }

        if (this.clientConnected !== true) {
          connectAndSetupClient();
          return timeout = setTimeout(waitForConnect, this.connectRetry);
        }

      } else {
        clearTimeout(timeout);
        if (!this.clientConnected) {
          if (this.handlerClient != null) { this.handlerClient.destroy(); }
          const msg = `Connection timeout ${this.connectTimeout / 1000}s to hooks handler ` +
          `on ${this.handlerHost}:${this.handlerPort} exceeded. Try increasing the limit.`;
          const error = new Error(msg);
          return callback(error);
        }
      }
    };

    var connectAndSetupClient = () => {
      logger.verbose('Starting TCP connection with hooks handler process.');

      if (this.runner.hookHandlerError != null) {
        return callback(this.runner.hookHandlerError);
      }

      this.handlerClient = net.connect({port: this.handlerPort, host: this.handlerHost});

      this.handlerClient.on('connect', () => {
        logger.info(`Successfully connected to hooks handler. Waiting ${this.afterConnectWait / 1000}s to start testing.`);
        this.clientConnected = true;
        clearTimeout(timeout);
        return setTimeout(callback, this.afterConnectWait);
      });

      this.handlerClient.on('close', () => logger.debug('TCP communication with hooks handler closed.'));

      this.handlerClient.on('error', connectError => {
        logger.debug('TCP communication with hooks handler errored.', connectError);
        return this.connectError = connectError;
      });

      let handlerBuffer = '';

      return this.handlerClient.on('data', data => {
        logger.debug('Dredd received some data from hooks handler.');

        handlerBuffer += data.toString();
        if (data.toString().indexOf(this.handlerMessageDelimiter) > -1) {
          const splittedData = handlerBuffer.split(this.handlerMessageDelimiter);

          // add last chunk to the buffer
          handlerBuffer = splittedData.pop();

          const messages = [];
          for (var message of splittedData) {
            messages.push(JSON.parse(message));
          }

          return (() => {
            const result = [];
            for (message of messages) {
              if (message.uuid != null) {
                logger.verbose('Dredd received a valid message from hooks handler:', message.uuid);
                result.push(this.emitter.emit(message.uuid, message));
              } else {
                result.push(logger.verbose('UUID not present in hooks handler message, ignoring:', JSON.stringify(message, null, 2)));
              }
            }
            return result;
          })();
        }
      });
    };

    return timeout = setTimeout(waitForConnect, this.connectRetry);
  }

  registerHooks(callback) {
    const eachHookNames = [
      'beforeEach',
      'beforeEachValidation',
      'afterEach',
      'beforeAll',
      'afterAll'
    ];

    for (let eventName of eachHookNames) { (eventName => {
      return this.runner.hooks[eventName]((data, hookCallback) => {
        const uuid = generateUuid();

        // send transaction to the handler
        const message = {
          event: eventName,
          uuid,
          data
        };

        logger.verbose('Sending HTTP transaction data to hooks handler:', uuid);
        this.handlerClient.write(JSON.stringify(message));
        this.handlerClient.write(this.handlerMessageDelimiter);

        // register event for the sent transaction
        const messageHandler = function(receivedMessage) {
          let value;
          logger.verbose('Handling hook:', uuid);
          clearTimeout(timeout);

          // We are directly modifying the `data` argument here. Neither direct
          // assignment (`data = receivedMessage.data`) nor `clone()` will work...

          // *All hooks receive array of transactions
          if (eventName.indexOf('All') > -1) {
            for (let index = 0; index < receivedMessage.data.length; index++) {
              value = receivedMessage.data[index];
              data[index] = value;
            }
          // *Each hook receives single transaction
          } else {
            for (let key of Object.keys(receivedMessage.data || {})) {
              value = receivedMessage.data[key];
              data[key] = value;
            }
          }

          return hookCallback();
        };

        const handleTimeout = () => {
          logger.warn('Hook handling timed out.');

          if (eventName.indexOf('All') === -1) {
            data.fail = 'Hook timed out.';
          }

          this.emitter.removeListener(uuid, messageHandler);

          return hookCallback();
        };

        // set timeout for the hook
        var timeout = setTimeout(handleTimeout, this.timeout);

        return this.emitter.on(uuid, messageHandler);
      });
    })(eventName); }

    this.runner.hooks.afterAll((transactions, hookCallback) => {
      // This is needed for transaction modification integration tests:
      // https://github.com/apiaryio/dredd-hooks-template/blob/master/features/execution_order.feature
      if (process.env.TEST_DREDD_HOOKS_HANDLER_ORDER === 'true') {
        console.error('FOR TESTING ONLY');
        const modifications = (transactions[0] != null ? transactions[0].hooks_modifications : undefined) || [];
        if (!modifications.length) {
          throw new Error('Hooks must modify transaction.hooks_modifications');
        }
        for (let index = 0; index < modifications.length; index++) {
          const modification = modifications[index];
          console.error(`${index} ${modification}`);
        }
        console.error('FOR TESTING ONLY');
      }
      return this.stop(hookCallback);
    });

    return callback();
  }
}



module.exports = HooksWorkerClient;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}