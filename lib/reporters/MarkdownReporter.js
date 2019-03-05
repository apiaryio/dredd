const { EventEmitter } = require('events');
const fs = require('fs');
const { inherits } = require('util');

const untildify = require('untildify');
const makeDir = require('make-dir');
const pathmodule = require('path');

const logger = require('../logger');
const reporterOutputLogger = require('./reporterOutputLogger');
const prettifyResponse = require('../prettifyResponse');

function MarkdownReporter(emitter, stats, tests, path, details) {
  EventEmitter.call(this);

  this.type = 'markdown';
  this.stats = stats;
  this.tests = tests;
  this.buf = '';
  this.level = 1;
  this.details = details;
  this.path = this.sanitizedPath(path);

  this.configureEmitter(emitter);

  logger.debug(`Using '${this.type}' reporter.`);
}

MarkdownReporter.prototype.sanitizedPath = function sanitizedPath(path = './report.md') {
  const filePath = pathmodule.resolve(untildify(path));
  if (fs.existsSync(filePath)) {
    logger.warn(`File exists at ${filePath}, will be overwritten...`);
  }
  return filePath;
};

MarkdownReporter.prototype.configureEmitter = function configureEmitter(emitter) {
  const title = str => `${Array(this.level).join('#')} ${str}`;

  emitter.on('start', (apiDescriptions, callback) => {
    this.level++;
    this.buf += `${title('Dredd Tests')}\n`;
    callback();
  });

  emitter.on('end', (callback) => {
    makeDir(pathmodule.dirname(this.path))
      .then(() => {
        fs.writeFile(this.path, this.buf, (error) => {
          if (error) { reporterOutputLogger.error(error); }
          callback();
        });
      })
      .catch((err) => {
        reporterOutputLogger.error(err);
        callback();
      });
  });

  emitter.on('test start', () => {
    this.level++;
  });

  emitter.on('test pass', (test) => {
    this.buf += `${title(`Pass: ${test.title}`)}\n`;

    if (this.details) {
      this.level++;
      this.buf += `${title('Request')}\n\`\`\`\n${prettifyResponse(test.request)}\n\`\`\`\n\n`;
      this.buf += `${title('Expected')}\n\`\`\`\n${prettifyResponse(test.expected)}\n\`\`\`\n\n`;
      this.buf += `${title('Actual')}\n\`\`\`\n${prettifyResponse(test.actual)}\n\`\`\`\n\n`;
      this.level--;
    }

    this.level--;
  });

  emitter.on('test skip', (test) => {
    this.buf += `${title(`Skip: ${test.title}`)}\n`;
    this.level--;
  });

  emitter.on('test fail', (test) => {
    this.buf += title(`Fail: ${test.title}\n`);

    this.level++;
    this.buf += `${title('Message')}\n\`\`\`\n${test.message}\n\`\`\`\n\n`;
    this.buf += `${title('Request')}\n\`\`\`\n${prettifyResponse(test.request)}\n\`\`\`\n\n`;
    this.buf += `${title('Expected')}\n\`\`\`\n${prettifyResponse(test.expected)}\n\`\`\`\n\n`;
    this.buf += `${title('Actual')}\n\`\`\`\n${prettifyResponse(test.actual)}\n\`\`\`\n\n`;
    this.level--;

    this.level--;
  });

  emitter.on('test error', (error, test) => {
    this.buf += title(`Error: ${test.title}\n`);
    this.buf += '\n```\n';
    this.buf += `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
    this.buf += '```\n\n';
    this.level--;
  });
};

inherits(MarkdownReporter, EventEmitter);

module.exports = MarkdownReporter;
