const { EventEmitter } = require('events');
const fs = require('fs');
const { inherits } = require('util');

const htmlencode = require('htmlencode');
const file = require('file');
const fsExtra = require('fs-extra');
const pathmodule = require('path');

const logger = require('./../logger');
const prettifyResponse = require('./../prettify-response');

function XUnitReporter(emitter, stats, tests, path, details) {
  EventEmitter.call(this);

  this.type = 'xunit';
  this.stats = stats;
  this.tests = tests;
  this.details = details;
  this.path = this.sanitizedPath(path);

  this.configureEmitter(emitter);

  logger.verbose(`Using '${this.type}' reporter.`);
}

XUnitReporter.prototype.updateSuiteStats = function (path, stats, callback) {
  fs.readFile(path, (err, data) => {
    if (!err) {
      data = data.toString();
      const position = data.toString().indexOf('\n');
      if (position !== -1) {
        const restOfFile = data.substr(position + 1);
        const newStats = this.toTag('testsuite', {
          name: 'Dredd Tests',
          tests: stats.tests,
          failures: stats.failures,
          errors: stats.errors,
          skip: stats.skipped,
          timestamp: (new Date()).toUTCString(),
          time: stats.duration / 1000
        }, false);
        const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
        fs.writeFile(path, xmlHeader + '\n' + newStats + '\n' + restOfFile + '</testsuite>', err => {
          if (err) { logger.error(err); }
          callback();
        });
      } else {
        callback();
      }
    } else {
      logger.error(err);
      callback();
    }
  });
}
  
XUnitReporter.prototype.cdata = function (str) {
  return `<![CDATA[${str}]]>`;
}

XUnitReporter.prototype.appendLine = function (path, line) {
  fs.appendFileSync(path, line + '\n');
}

XUnitReporter.prototype.toTag = function (name, attrs, close, content) {
  const end = close ? '/>' : '>';
  const pairs = [];
  for (let key in attrs) {
    pairs.push(key + '=\"" + attrs[key] + "\"');
  }
  let tag = `<${name}${pairs.length ? ` ${pairs.join(' ')}` : ''}${end}`;
  if (content) { tag += content + '</' + name + end; }
  return tag;
};

XUnitReporter.prototype.sanitizedPath = function (path) {
  const filePath = path ? file.path.abspath(path) : file.path.abspath('./report.xml');
  if (fs.existsSync(filePath)) {
    logger.info(`File exists at ${filePath}, will be overwritten...`);
    fs.unlinkSync(filePath);
  }
  return filePath;
}

XUnitReporter.prototype.configureEmitter = function (emitter) {
  emitter.on('start', (rawBlueprint, callback) => {
    fsExtra.mkdirp(pathmodule.dirname(this.path), err => {
      if (!err) {
        this.appendLine(this.path, this.toTag('testsuite', {
          name: 'Dredd Tests',
          tests: this.stats.tests,
          failures: this.stats.failures,
          errors: this.stats.errors,
          skip: this.stats.skipped,
          timestamp: (new Date()).toUTCString(),
          time: this.stats.duration / 1000
        }, false)
        );
        callback();
      } else {
        logger.error(err);
        callback();
      }
    });
  });

  emitter.on('end', callback => {
    this.updateSuiteStats(this.path, this.stats, callback);
  });

  emitter.on('test pass', test => {
    let attrs = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000
    };

    if (this.details) {
      const deets = `\
\nRequest:
${prettifyResponse(test.request)}
Expected:
${prettifyResponse(test.expected)}
Actual:
${prettifyResponse(test.actual)}\
`;
      this.appendLine(
        this.path,
        this.toTag('testcase', attrs, false, this.toTag('system-out', null, false, this.cdata(deets)))
      );
    } else {
      this.appendLine(this.path, this.toTag('testcase', attrs, true));
    }
  });

  emitter.on('test skip', test => {
    let attrs = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000
    };
    this.appendLine(this.path, this.toTag('testcase', attrs, false, this.toTag('skipped', null, true)));
  });

  emitter.on('test fail', test => {
    let attrs = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000
    };
    const diff = `\
Message:
${test.message}
Request:
${prettifyResponse(test.request)}
Expected:
${prettifyResponse(test.expected)}
Actual:
${prettifyResponse(test.actual)}\
`;
    this.appendLine(
      this.path,
      this.toTag('testcase', attrs, false, this.toTag('failure', null, false, this.cdata(diff)))
    );
  });

  emitter.on('test error', (error, test) => {
    let attrs = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000
    };
    const errorMessage = `\nError: \n${error}\nStacktrace: \n${error.stack}`;
    this.appendLine(
      this.path,
      this.toTag('testcase', attrs, false, this.toTag('failure', null, false, this.cdata(errorMessage)))
    );
  });
}

inherits(XUnitReporter, EventEmitter);

module.exports = XUnitReporter;
