const {EventEmitter} = require('events');
const fs = require('fs');

const htmlencode = require('htmlencode');
const file = require('file');
const pathmodule = require('path');
const fsExtra = require('fs-extra');

const logger = require('./../logger');
const prettifyResponse = require('./../prettify-response');


var XUnitReporter = (function() {
  let updateSuiteStats = undefined;
  let cdata = undefined;
  let appendLine = undefined;
  let toTag = undefined;
  XUnitReporter = class XUnitReporter extends EventEmitter {
    static initClass() {
  
      updateSuiteStats = (path, stats, callback) =>
        fs.readFile(path, (err, data) => {
          if (!err) {
            data = data.toString();
            const position = data.toString().indexOf('\n');
            if (position !== -1) {
              const restOfFile = data.substr(position + 1);
              const newStats = toTag('testsuite', {
                name: 'Dredd Tests',
                tests: stats.tests,
                failures: stats.failures,
                errors: stats.errors,
                skip: stats.skipped,
                timestamp: (new Date()).toUTCString(),
                time: stats.duration / 1000
              }, false);
              const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
              return fs.writeFile(path, xmlHeader + '\n' + newStats + '\n' + restOfFile + '</testsuite>', function(err) {
                if (err) { logger.error(err); }
                return callback();
              });
            } else {
              return callback();
            }
          } else {
            logger.error(err);
            return callback();
          }
        })
      ;
  
      cdata = str => `<![CDATA[${str}]]>`;
  
      appendLine = (path, line) => fs.appendFileSync(path, line + "\n");
  
      toTag = function(name, attrs, close, content) {
        const end = (close ? "/>" : ">");
        const pairs = [];
        let tag = undefined;
        for (let key in attrs) {
          pairs.push(key + "=\"" + attrs[key] + "\"");
        }
        tag = `<${name}${pairs.length ? ` ${pairs.join(" ")}` : ""}${end}`;
        if (content) { tag += content + "</" + name + end; }
        return tag;
      };
    }
    constructor(emitter, stats, tests, path, details) {
      super();
      this.type = 'xunit';
      this.stats = stats;
      this.tests = tests;
      this.path = this.sanitizedPath(path);
      this.details = details;
      this.configureEmitter(emitter);
      logger.verbose(`Using '${this.type}' reporter.`);
    }

    sanitizedPath(path) {
      const filePath = (path != null) ? file.path.abspath(path) : file.path.abspath("./report.xml");
      if (fs.existsSync(filePath)) {
        logger.info(`File exists at ${filePath}, will be overwritten...`);
        fs.unlinkSync(filePath);
      }
      return filePath;
    }

    configureEmitter(emitter) {
      let attrs;
      emitter.on('start', (rawBlueprint, callback) => {
        return fsExtra.mkdirp(pathmodule.dirname(this.path), err => {
          if (!err) {
            appendLine(this.path, toTag('testsuite', {
              name: 'Dredd Tests',
              tests: this.stats.tests,
              failures: this.stats.failures,
              errors: this.stats.errors,
              skip: this.stats.skipped,
              timestamp: (new Date()).toUTCString(),
              time: this.stats.duration / 1000
            }, false)
            );
            return callback();
          } else {
            logger.error(err);
            return callback();
          }
        });
      });

      emitter.on('end', callback => {
        return updateSuiteStats(this.path, this.stats, callback);
      });

      emitter.on('test pass', test => {
        attrs = {
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
          return appendLine(this.path, toTag('testcase', attrs, false, toTag('system-out', null, false, cdata(deets))));
        } else {
          return appendLine(this.path, toTag('testcase', attrs, true));
        }
      });

      emitter.on('test skip', test => {
        attrs = {
          name: htmlencode.htmlEncode(test.title),
          time: test.duration / 1000
        };
        return appendLine(this.path, toTag('testcase', attrs, false, toTag('skipped', null, true)));
      });

      emitter.on('test fail', test => {
        attrs = {
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
        return appendLine(this.path, toTag('testcase', attrs, false, toTag('failure', null, false, cdata(diff))));
      });

      return emitter.on('test error', (error, test) => {
        attrs = {
          name: htmlencode.htmlEncode(test.title),
          time: test.duration / 1000
        };
        const errorMessage = `\nError: \n${error}\nStacktrace: \n${error.stack}`;
        return appendLine(this.path, toTag('testcase', attrs, false, toTag('failure', null, false, cdata(errorMessage))));
      });
    }
  };
  XUnitReporter.initClass();
  return XUnitReporter;
})();

module.exports = XUnitReporter;
