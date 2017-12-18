const {EventEmitter} = require('events');
const fs = require('fs');

const md = require('markdown-it')();
const file = require('file');
const fsExtra = require('fs-extra');
const pathmodule = require('path');

const logger = require('./../logger');
const prettifyResponse = require('./../prettify-response');


class HtmlReporter extends EventEmitter {
  constructor(emitter, stats, tests, path, details) {
    super();
    this.type = 'html';
    this.stats = stats;
    this.tests = tests;
    this.path = this.sanitizedPath(path);
    this.buf = '';
    this.level = 1;
    this.details = details;
    this.configureEmitter(emitter);
    logger.verbose(`Using '${this.type}' reporter.`);
  }

  sanitizedPath(path) {
    const filePath = (path != null) ? file.path.abspath(path) : file.path.abspath("./report.html");
    if (fs.existsSync(filePath)) {
      logger.info(`File exists at ${filePath}, will be overwritten...`);
    }
    return filePath;
  }

  configureEmitter(emitter) {

    const title = str => {
      return Array(this.level).join("#") + " " + str;
    };
    // indent = ->
    //   Array(@level).join "  "

    emitter.on('start', (rawBlueprint, callback) => {
      this.level++;
      this.buf += title('Dredd Tests') + "\n";
      return callback();
    });

    emitter.on('end', callback => {
      const html = md.render(this.buf);
      return fsExtra.mkdirp(pathmodule.dirname(this.path), err => {
        if (!err) {
          return fs.writeFile(this.path, html, function(err) {
            if (err) { logger.error(err); }
            return callback();
          });
        } else {
          if (err) { logger.error(err); }
          return callback();
        }
      });
    });

    emitter.on('test start', test => {
      return this.level++;
    });

    emitter.on('test pass', test => {
      this.buf += title(`Pass: ${test.title}`) +  "\n";

      if (this.details) {
        this.level++;
        this.buf += title("Request") + "\n```\n" + prettifyResponse(test.request) + "\n```\n\n";
        this.buf += title("Expected") + "\n```\n" + prettifyResponse(test.expected) + "\n```\n\n";
        this.buf += title("Actual") + "\n```\n" + prettifyResponse(test.actual) + "\n```\n\n";
        this.level--;
      }

      return this.level--;
    });

    emitter.on('test skip', test => {
      this.buf += title(`Skip: ${test.title}`) +  "\n";
      return this.level--;
    });

    emitter.on('test fail', test => {
      this.buf += title(`Fail: ${test.title}\n`);

      this.level++;
      this.buf += title("Message") + "\n```\n" + test.message + "\n```\n\n";
      this.buf += title("Request") + "\n```\n" + prettifyResponse(test.request) + "\n```\n\n";
      this.buf += title("Expected") + "\n```\n" + prettifyResponse(test.expected) + "\n```\n\n";
      this.buf += title("Actual") + "\n```\n" + prettifyResponse(test.actual) + "\n```\n\n";
      this.level--;

      return this.level--;
    });

    return emitter.on('test error', (error, test) => {
      this.buf += title(`Error: ${test.title}\n`);
      this.buf += "\n```\n";
      this.buf += `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
      this.buf += "```\n\n";
      return this.level--;
    });
  }
}



module.exports = HtmlReporter;
