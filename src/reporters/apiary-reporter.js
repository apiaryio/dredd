const clone = require('clone');
const generateUuid = require('uuid').v4;
const os = require('os');
const request = require('request');
const url = require('url');

const logger = require('./../logger');
const packageData = require('./../../package.json');

const CONNECTION_ERRORS = [
  'ECONNRESET',
  'ENOTFOUND',
  'ESOCKETTIMEDOUT',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'EPIPE'
];

function ApiaryReporter(emitter, stats, tests, config, runner) {
  this.type = 'apiary';
  this.stats = stats;
  this.tests = tests;
  this.uuid = null;
  this.startedAt = null;
  this.endedAt = null;
  this.remoteId = null;
  this.config = config;
  this.runner = runner;
  this.reportUrl = null;
  this.errors = [];
  this.serverError = false;
  this.configuration = {
    apiUrl: (this._get('apiaryApiUrl', 'APIARY_API_URL', 'https://api.apiary.io')).replace(/\/$/, ''),
    apiToken: this._get('apiaryApiKey', 'APIARY_API_KEY', null),
    apiSuite: this._get('apiaryApiName', 'APIARY_API_NAME', null)
  };
  
  this.configureEmitter(emitter);

  logger.verbose(`Using '${this.type}' reporter.`);

  if (!this.configuration.apiToken && !this.configuration.apiSuite) {
    logger.warn(`\
Apiary API Key or API Project Subdomain were not provided. \
Configure Dredd to be able to save test reports alongside your Apiary API project: \
https://dredd.readthedocs.io/en/latest/how-to-guides/#using-apiary-reporter-and-apiary-tests\
`);
  }
  if (this.configuration.apiSuite == null) { this.configuration.apiSuite = 'public'; }
}

// THIS IS HIIIIGHWAY TO HELL, HIIIIIGHWAY TO HELL. Everything should have one single interface
ApiaryReporter.prototype._get = function (customProperty, envProperty, defaultVal) {
  let returnVal = defaultVal;

  // this will be deprecated
  if ((this.config.custom != null ? this.config.custom[customProperty] : undefined) != null) {
    returnVal = this.config.custom[customProperty];

  // this will be the ONLY supported way how to configure this reporter
  } else if (__guard__(this.config.options != null ? this.config.options.custom : undefined, x => x[customProperty]) != null) {
    returnVal = this.config.options.custom[customProperty];

  // this will be deprecated
  } else if (__guard__(this.config.custom != null ? this.config.custom.apiaryReporterEnv : undefined, x1 => x1[customProperty]) != null) {
    returnVal = this.config.custom.apiaryReporterEnv[customProperty];

  // this will be deprecated
  } else if (__guard__(this.config.custom != null ? this.config.custom.apiaryReporterEnv : undefined, x2 => x2[envProperty]) != null) {
    returnVal = this.config.custom.apiaryReporterEnv[envProperty];

  // this will be supported for backward compatibility, but can be removed in future.
  } else if (process.env[envProperty] != null) {
    returnVal = process.env[envProperty];
  }

  return returnVal;
}

ApiaryReporter.prototype._getKeys = function () {
  let returnKeys = [];
  returnKeys = returnKeys.concat(Object.keys(
    (this.config.custom != null ? this.config.custom.apiaryReporterEnv : undefined) || {})
  );
  return returnKeys.concat(Object.keys(process.env));
}

ApiaryReporter.prototype.configureEmitter = function (emitter) {
  emitter.on('start', (blueprintsData, callback) => {
    if (this.serverError === true) { return callback(); }
    this.uuid = generateUuid();
    this.startedAt = Math.round(new Date().getTime() / 1000);

    // Cycle through all keys from
    // - config.custom.apiaryReporterEnv
    // - process.env keys
    const ciVars = /^(TRAVIS|CIRCLE|CI|DRONE|BUILD_ID)/;
    const envVarNames = this._getKeys();
    const ciEnvVars = {};
    for (let envVarName of envVarNames) {
      if (envVarName.match(ciVars) != null) {
        ciEnvVars[envVarName] = this._get(envVarName, envVarName);
      }
    }

    // Transform blueprints data to array
    let blueprints = [];
    for (let filename of Object.keys(blueprintsData || {})) {
      blueprints.push(blueprintsData[filename]);
    }

    let data = {
      blueprints,
      endpoint: this.config.server,
      agent: this._get('dreddAgent', 'DREDD_AGENT') || this._get('user', 'USER'),
      agentRunUuid: this.uuid,
      hostname: this._get('dreddHostname', 'DREDD_HOSTNAME') || os.hostname(),
      startedAt: this.startedAt,
      public: true,
      status: 'running',
      agentEnvironment: ciEnvVars
    };

    if ((this.configuration.apiToken != null) && (this.configuration.apiSuite != null)) {
      data.public = false;
    }

    let path = `/apis/${this.configuration.apiSuite}/tests/runs`;

    this._performRequestAsync(path, 'POST', data, (error, response, parsedBody) => {
      if (error) {
        callback(error);
      } else {
        this.remoteId = parsedBody._id;
        if (parsedBody.reportUrl) { this.reportUrl = parsedBody.reportUrl; }
        callback();
      }
    });
  });

  emitter.on('test pass', this._createStep.bind(this));

  emitter.on('test fail', this._createStep.bind(this));

  emitter.on('test skip', this._createStep.bind(this));

  emitter.on('test error', (error, test, callback) => {
    if (this.serverError === true) { return callback(); }
    let data = _transformTestToReporter(test);

    if (data.resultData.result == null) { data.resultData.result = {}; }
    if (data.resultData.result.general == null) { data.resultData.result.general = []; }

    if (Array.from(CONNECTION_ERRORS).includes(error.code)) {
      data.resultData.result.general.push({
        severity: 'error', message: 'Error connecting to server under test!'
      });
    } else {
      data.resultData.result.general.push({
        severity: 'error', message: 'Unhandled error occured when executing the transaction.'
      });
    }

    let path = `/apis/${this.configuration.apiSuite}/tests/steps?testRunId=${this.remoteId}`;
    this._performRequestAsync(path, 'POST', data, (error, response, parsedBody) => {
      if (error) { return callback(error); }
      callback();
    });
  });

  emitter.on('end', callback => {
    if (this.serverError === true) { return callback(); }

    let data = {
      endedAt: Math.round(new Date().getTime() / 1000),
      result: this.stats,
      status: ((this.stats.failures > 0) || (this.stats.errors > 0)) ? 'failed' : 'passed',
      logs: __guard__(this.runner != null ? this.runner.logs : undefined, x => x.length) ? this.runner.logs : undefined
    };

    let path = `/apis/${this.configuration.apiSuite}/tests/run/${this.remoteId}`;

    this._performRequestAsync(path, 'PATCH', data, (error, response, parsedBody) => {
      if (error) { return callback(error); }
      const reportUrl = this.reportUrl || `https://app.apiary.io/${this.configuration.apiSuite}/tests/run/${this.remoteId}`;
      logger.complete(`See results in Apiary at: ${reportUrl}`);
      callback();
    });
  });
}

ApiaryReporter.prototype._createStep = function (test, callback) {
  if (this.serverError === true) { return callback(); }
  let data = _transformTestToReporter(test);
  let path = `/apis/${this.configuration.apiSuite}/tests/steps?testRunId=${this.remoteId}`;
  this._performRequestAsync(path, 'POST', data, (error, response, parsedBody) => {
    if (error) { return callback(error); }
    callback();
  });
};

ApiaryReporter.prototype._performRequestAsync = function (path, method, reqBody, callback) {
  const handleRequest = (err, res, resBody) => {
    let parsedBody;
    if (err) {
      this.serverError = true;
      logger.debug('Requesting Apiary API errored:', `${err}` || err.code);

      if (Array.from(CONNECTION_ERRORS).includes(err.code)) {
        return callback(new Error('Apiary reporter could not connect to Apiary API'));
      } else {
        return callback(err);
      }
    }

    logger.verbose('Handling HTTP response from Apiary API');

    try {
      parsedBody = JSON.parse(resBody);
    } catch (error) {
      this.serverError = true;
      err = new Error(`\
Apiary reporter failed to parse Apiary API response body: \
${error.message}\n${resBody}\
`);
      return callback(err);
    }

    const info = { headers: res.headers, statusCode: res.statusCode, body: parsedBody };
    
    logger.debug('Apiary reporter response:', JSON.stringify(info, null, 2));
    
    callback(null, res, parsedBody);
  };

  const body = reqBody ? JSON.stringify(reqBody) : '';
  const system = os.type() + ' ' + os.release() + '; ' + os.arch();
  const headers = {
    'User-Agent': `Dredd Apiary Reporter/${packageData.version} (${system})`,
    'Content-Type': 'application/json'
  };

  let options = clone(this.config.http || {});
  options.uri = this.configuration.apiUrl + path;
  options.method = method;
  options.headers = headers;
  options.body = body;

  if (this.configuration.apiToken) {
    options.headers.Authentication = `Token ${this.configuration.apiToken}`;
  }

  try {
    const protocol = options.uri.split(':')[0].toUpperCase();
    logger.verbose(`\
About to perform an ${protocol} request from Apiary reporter \
to Apiary API: ${options.method} ${options.uri} \
(${body ? 'with' : 'without'} body)\
`);
    logger.debug('Request details:', JSON.stringify({options, body}, null, 2));
    return request(options, handleRequest);
  } catch (error) {
    this.serverError = true;
    logger.debug('Requesting Apiary API errored:', error);
    return callback(error);
  }
}

function _transformTestToReporter(test) {
  return {
    testRunId: this.remoteId,
    origin: test.origin,
    duration: test.duration,
    result: test.status,
    startedAt: test.startedAt,
    resultData: {
      request: test.request,
      realResponse: test.actual,
      expectedResponse: test.expected,
      result: test.results
    }
  };
}

module.exports = ApiaryReporter;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
