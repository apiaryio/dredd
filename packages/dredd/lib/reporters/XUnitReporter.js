import { EventEmitter } from 'events';
import fs from 'fs';
import { inherits } from 'util';

import htmlencode from 'htmlencode';
import untildify from 'untildify';
import makeDir from 'make-dir';
import pathmodule from 'path';

import logger from '../logger';
import reporterOutputLogger from './reporterOutputLogger';
import prettifyResponse from '../prettifyResponse';

function XUnitReporter(emitter, stats, path, details) {
  EventEmitter.call(this);

  this.type = 'xunit';
  this.stats = stats;
  this.details = details;
  this.path = this.sanitizedPath(path);

  this.configureEmitter(emitter);

  logger.debug(`Using '${this.type}' reporter.`);
}

XUnitReporter.prototype.updateSuiteStats = function updateSuiteStats(
  path,
  stats,
  callback,
) {
  fs.readFile(path, (err, data) => {
    if (!err) {
      data = data.toString();
      const position = data.toString().indexOf('\n');
      if (position !== -1) {
        const restOfFile = data.substr(position + 1);
        const newStats = this.toTag(
          'testsuite',
          {
            name: 'Dredd Tests',
            tests: stats.tests,
            failures: stats.failures,
            errors: stats.errors,
            skip: stats.skipped,
            timestamp: new Date().toUTCString(),
            time: stats.duration / 1000,
          },
          false,
        );
        const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
        fs.writeFile(
          path,
          `${xmlHeader}\n${newStats}\n${restOfFile}</testsuite>`,
          (error) => {
            if (error) {
              reporterOutputLogger.error(error);
            }
            callback();
          },
        );
      } else {
        callback();
      }
    } else {
      reporterOutputLogger.error(err);
      callback();
    }
  });
};

XUnitReporter.prototype.cdata = function cdata(str) {
  return `<![CDATA[${str}]]>`;
};

XUnitReporter.prototype.appendLine = function appendLine(path, line) {
  fs.appendFileSync(path, `${line}\n`);
};

XUnitReporter.prototype.toTag = function toTag(name, attrs, close, content) {
  const end = close ? '/>' : '>';
  const pairs = [];
  if (attrs) {
    Object.keys(attrs).forEach((key) => pairs.push(`${key}="${attrs[key]}"`));
  }
  let tag = `<${name}${pairs.length ? ` ${pairs.join(' ')}` : ''}${end}`;
  if (content) {
    tag += `${content}</${name}${end}`;
  }
  return tag;
};

XUnitReporter.prototype.sanitizedPath = function sanitizedPath(
  path = './report.xml',
) {
  const filePath = pathmodule.resolve(untildify(path));
  if (fs.existsSync(filePath)) {
    logger.warn(`File exists at ${filePath}, will be overwritten...`);
    fs.unlinkSync(filePath);
  }
  return filePath;
};

XUnitReporter.prototype.configureEmitter = function configureEmitter(emitter) {
  emitter.on('start', (apiDescriptions, callback) => {
    makeDir(pathmodule.dirname(this.path))
      .then(() => {
        this.appendLine(
          this.path,
          this.toTag(
            'testsuite',
            {
              name: 'Dredd Tests',
              tests: this.stats.tests,
              failures: this.stats.failures,
              errors: this.stats.errors,
              skip: this.stats.skipped,
              timestamp: new Date().toUTCString(),
              time: this.stats.duration / 1000,
            },
            false,
          ),
        );
        callback();
      })
      .catch((err) => {
        reporterOutputLogger.error(err);
        callback();
      });
  });

  emitter.on('end', (callback) => {
    this.updateSuiteStats(this.path, this.stats, callback);
  });

  emitter.on('test pass', (test) => {
    const attrs = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000,
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
        this.toTag(
          'testcase',
          attrs,
          false,
          this.toTag('system-out', null, false, this.cdata(deets)),
        ),
      );
    } else {
      this.appendLine(this.path, this.toTag('testcase', attrs, true));
    }
  });

  emitter.on('test skip', (test) => {
    const attrs = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000,
    };
    this.appendLine(
      this.path,
      this.toTag('testcase', attrs, false, this.toTag('skipped', null, true)),
    );
  });

  emitter.on('test fail', (test) => {
    const attrs = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000,
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
      this.toTag(
        'testcase',
        attrs,
        false,
        this.toTag('failure', null, false, this.cdata(diff)),
      ),
    );
  });

  emitter.on('test error', (error, test) => {
    const attrs = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000,
    };
    const errorMessage = `\nError: \n${error}\nStacktrace: \n${error.stack}`;
    this.appendLine(
      this.path,
      this.toTag(
        'testcase',
        attrs,
        false,
        this.toTag('failure', null, false, this.cdata(errorMessage)),
      ),
    );
  });
};

inherits(XUnitReporter, EventEmitter);

export default XUnitReporter;
