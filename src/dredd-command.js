// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const path = require('path');
const optimist = require('optimist');
const fs = require('fs');
const os = require('os');
const spawnArgs = require('spawn-args');
const spawnSync = require('cross-spawn').sync;
const console = require('console'); // stubbed in tests by proxyquire

const Dredd = require('./dredd');
const interactiveConfig = require('./interactive-config');
const {applyLoggingOptions} = require('./configuration');
const configUtils = require('./config-utils');
const {spawn} = require('./child-process');
const logger = require('./logger');

const packageData = require('../package.json');


class DreddCommand {
  constructor(options = {}, cb) {
    this.cb = cb;
    this.finished = false;
    ({exit: this.exit, custom: this.custom} = options);

    this.setExitOrCallback();

    if (this.custom == null) { this.custom = {}; }

    if (!this.custom.cwd || (typeof this.custom.cwd !== 'string')) {
      this.custom.cwd = process.cwd();
    }

    if (!this.custom.argv || !Array.isArray(this.custom.argv)) {
      this.custom.argv = [];
    }
  }

  setOptimistArgv() {
    this.optimist = optimist(this.custom.argv, this.custom.cwd);
    this.cliArgv = this.optimist.argv;

    this.optimist.usage(`\
Usage:
  $ dredd init

Or:
  $ dredd <path or URL to API description document> <URL of tested server> [OPTIONS]

Example:
  $ dredd ./api-description.apib http://127.0.0.1:3000 --dry-run\
`)
      .options(Dredd.options)
      .wrap(80);

    this.argv = this.optimist.argv;
    return this.argv = applyLoggingOptions(this.argv);
  }

  // Gracefully terminate server
  stopServer(callback) {
    if (!this.serverProcess || !this.serverProcess.spawned) {
      logger.verbose('No backend server process to terminate.');
      return callback();
    }
    if (this.serverProcess.terminated) {
      logger.debug('The backend server process has already terminated');
      return callback();
    }
    logger.verbose('Terminating backend server process, PID', this.serverProcess.pid);
    this.serverProcess.terminate({force: true});
    return this.serverProcess.on('exit', () => callback());
  }

  // This thing-a-ma-bob here is only for purpose of testing
  // It's basically a dependency injection for the process.exit function
  setExitOrCallback() {
    if (!this.cb) {
      if (this.exit && (this.exit === process.exit)) {
        this.sigIntEventAdd = true;
      }

      if (this.exit) {
        return this._processExit = exitStatus => {
          logger.verbose(`Exiting Dredd process with status '${exitStatus}'.`);
          logger.debug('Using configured custom exit() method to terminate the Dredd process.');
          this.finished = true;
          return this.stopServer(() => {
            return this.exit(exitStatus);
          });
        };
      } else {
        return this._processExit = exitStatus => {
          logger.verbose(`Exiting Dredd process with status '${exitStatus}'.`);
          logger.debug('Using native process.exit() method to terminate the Dredd process.');
          return this.stopServer(() => process.exit(exitStatus));
        };
      }
    } else {
      return this._processExit = exitStatus => {
        logger.verbose(`Exiting Dredd process with status '${exitStatus}'.`);
        logger.debug('Using configured custom callback to terminate the Dredd process.');
        this.finished = true;
        if (this.sigIntEventAdded) {
          if ((this.serverProcess != null) && !this.serverProcess.terminated) {
            logger.verbose('Killing backend server process before Dredd exits.');
            this.serverProcess.signalKill();
          }
          process.removeEventListener('SIGINT', this.commandSigInt);
        }
        this.cb(exitStatus);
        return this;
      };
    }
  }

  moveBlueprintArgToPath() {
    // transform path and p argument to array if it's not
    if (!Array.isArray(this.argv['path'])) {
      return this.argv['path'] = (this.argv['p'] = [this.argv['path']]);
    }
  }

  checkRequiredArgs() {
    let argError = false;

    // if 'blueprint' is missing
    if ((this.argv._[0] == null)) {
      console.error("\nError: Must specify path to API description document.");
      argError = true;
    }

    // if 'endpoint' is missing
    if ((this.argv._[1] == null)) {
      console.error("\nError: Must specify URL of the tested API instance.");
      argError = true;
    }

    // show help if argument is missing
    if (argError) {
      console.error("\n");
      this.optimist.showHelp(console.error);
      return this._processExit(1);
    }
  }

  runExitingActions() {
    // run interactive config
    if ((this.argv["_"][0] === "init") || (this.argv.init === true)) {
      logger.silly('Starting interactive configuration.');
      this.finished = true;
      return interactiveConfig.run(this.argv, config => {
        configUtils.save(config);
        console.log("");
        console.log("Configuration saved to dredd.yml");
        console.log("");
        if (config['language'] === "nodejs") {
          console.log("Run test now, with:");
        } else {
          console.log("Install hooks handler and run Dredd test with:");
        }
        console.log("");
        if (config['language'] === 'ruby') {
          console.log("  $ gem install dredd_hooks");
        } else if (config['language'] === 'python') {
          console.log("  $ pip install dredd_hooks");
        } else if (config['language'] === 'php') {
          console.log("  $ composer require ddelnano/dredd-hooks-php --dev");
        } else if (config['language'] === 'perl') {
          console.log("  $ cpanm Dredd::Hooks");
        } else if (config['language'] === 'go') {
          console.log("  $ go get github.com/snikch/goodman/cmd/goodman");
        } else if (config['language'] === 'rust') {
          console.log("  $ cargo install dredd-hooks");
        }

        console.log("  $ dredd");
        console.log("");

        return this._processExit(0);
      });

    // show help
    } else if (this.argv.help === true) {
      logger.silly('Printing help.');
      this.optimist.showHelp(console.error);
      return this._processExit(0);

    // show version
    } else if (this.argv.version === true) {
      logger.silly('Printing version.');
      console.log(`\
${packageData.name} v${packageData.version} \
(${os.type()} ${os.release()}; ${os.arch()})\
`);
      return this._processExit(0);
    }
  }

  loadDreddFile() {
    const configPath = this.argv.config;
    logger.verbose('Loading configuration file:', configPath);

    if (configPath && fs.existsSync(configPath)) {
      logger.info(`Configuration '${configPath}' found, ignoring other arguments.`);
      this.argv = configUtils.load(configPath);
    }

    // overwrite saved config with cli arguments
    for (let key in this.cliArgv) {
      const value = this.cliArgv[key];
      if ((key !== "_") && (key !== "$0")) {
        this.argv[key] = value;
      }
    }

    return this.argv = applyLoggingOptions(this.argv);
  }

  parseCustomConfig() {
    return this.argv.custom = configUtils.parseCustom(this.argv.custom);
  }

  runServerAndThenDredd(callback) {
    if ((this.argv['server'] == null)) {
      logger.verbose('No backend server process specified, starting testing at once');
      return this.runDredd(this.dreddInstance);
    } else {
      logger.verbose('Backend server process specified, starting backend server and then testing');

      const parsedArgs = spawnArgs(this.argv['server']);
      const command = parsedArgs.shift();

      logger.verbose(`Using '${command}' as a server command, ${JSON.stringify(parsedArgs)} as arguments`);
      this.serverProcess = spawn(command, parsedArgs);
      logger.info(`Starting backend server process with command: ${this.argv['server']}`);

      this.serverProcess.stdout.setEncoding('utf8');
      this.serverProcess.stdout.on('data', data => process.stdout.write(data.toString()));

      this.serverProcess.stderr.setEncoding('utf8');
      this.serverProcess.stderr.on('data', data => process.stdout.write(data.toString()));

      this.serverProcess.on('signalTerm', () => logger.verbose('Gracefully terminating the backend server process'));
      this.serverProcess.on('signalKill', () => logger.verbose('Killing the backend server process'));

      this.serverProcess.on('crash', (exitStatus, killed) => {
        if (killed) { return logger.info('Backend server process was killed'); }
      });

      this.serverProcess.on('exit', () => {
        return logger.info('Backend server process exited');
      });

      this.serverProcess.on('error', err => {
        logger.error('Command to start backend server process failed, exiting Dredd', err);
        return this._processExit(1);
      });

      // Ensure server is not running when dredd exits prematurely somewhere
      process.on('beforeExit', () => {
        if ((this.serverProcess != null) && !this.serverProcess.terminated) {
          logger.verbose('Killing backend server process before Dredd exits');
          return this.serverProcess.signalKill();
        }
      });

      // Ensure server is not running when dredd exits prematurely somewhere
      process.on('exit', () => {
        if ((this.serverProcess != null) && !this.serverProcess.terminated) {
          logger.verbose('Killing backend server process on Dredd\'s exit');
          return this.serverProcess.signalKill();
        }
      });

      const waitSecs = parseInt(this.argv['server-wait'], 10);
      const waitMilis = waitSecs * 1000;
      logger.info(`Waiting ${waitSecs} seconds for backend server process to start`);

      return this.wait = setTimeout(() => {
        return this.runDredd(this.dreddInstance);
      }
      , waitMilis);
    }
  }

  // This should be handled in a better way in the future:
  // https://github.com/apiaryio/dredd/issues/625
  logDebuggingInfo(config) {
    logger.debug('Dredd version:', packageData.version);
    logger.debug('Node.js version:', process.version);
    logger.debug('Node.js environment:', process.versions);
    logger.debug('System version:', os.type(), os.release(), os.arch());
    try {
      const npmVersion = spawnSync('npm', ['--version']).stdout.toString().trim();
      logger.debug('npm version:', npmVersion || 'unable to determine npm version');
    } catch (err) {
      logger.debug('npm version: unable to determine npm version:', err);
    }
    return logger.debug('Configuration:', JSON.stringify(config));
  }

  run() {
    for (let task of [
      this.setOptimistArgv,
      this.parseCustomConfig,
      this.runExitingActions,
      this.loadDreddFile,
      this.checkRequiredArgs,
      this.moveBlueprintArgToPath
    ]) {
      task.call(this);
      if (this.finished) { return; }
    }

    const configurationForDredd = this.initConfig();
    this.logDebuggingInfo(configurationForDredd);
    this.dreddInstance = this.initDredd(configurationForDredd);

    try {
      this.runServerAndThenDredd();
    } catch (e) {
      logger.error(e.message, e.stack);
      this.stopServer(() => {
        return this._processExit(2);
      });
    }
  }

  lastArgvIsApiEndpoint() {
    // when API description path is a glob, some shells are automatically expanding globs and concating
    // result as arguments so I'm taking last argument as API endpoint server URL and removing it
    // from optimist's args
    this.server = this.argv._[this.argv._.length - 1];
    this.argv._.splice(this.argv._.length - 1, 1);
    return this;
  }

  takeRestOfParamsAsPath() {
    // and rest of arguments concating to 'path' and 'p' opts, duplicates are filtered out later
    this.argv['p'] = (this.argv['path'] = this.argv['path'].concat(this.argv._));
    return this;
  }

  initConfig() {
    this.lastArgvIsApiEndpoint().takeRestOfParamsAsPath();

    const configuration = {
      'server': this.server,
      'options': this.argv
    };

    // push first argument (without some known configuration --key) into paths
    if (configuration.options.path == null) { configuration.options.path = []; }
    configuration.options.path.push(this.argv._[0]);

    configuration.custom = this.custom;

    return configuration;
  }

  initDredd(configuration) {
    return new Dredd(configuration);
  }

  commandSigInt() {
    logger.error('\nShutting down from keyboard interruption (Ctrl+C)');
    return this.dreddInstance.transactionsComplete(() => this._processExit(0));
  }

  runDredd(dreddInstance) {
    if (this.sigIntEventAdd) {
      // handle SIGINT from user
      this.sigIntEventAdded = !(this.sigIntEventAdd = false);
      process.on('SIGINT', this.commandSigInt);
    }

    logger.verbose('Running Dredd instance.');
    dreddInstance.run((error, stats) => {
      logger.verbose('Dredd instance run finished.');
      return this.exitWithStatus(error, stats);
    });

    return this;
  }

  exitWithStatus(error, stats) {
    if (error) {
      if (error.message) { logger.error(error.message); }
      return this._processExit(1);
    }

    if ((stats.failures + stats.errors) > 0) {
      this._processExit(1);
    } else {
      this._processExit(0);
    }
  }
}

module.exports = DreddCommand;
