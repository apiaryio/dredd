const tty = require('tty');

const logger = require('./../logger');
const prettifyResponse = require('./../prettify-response');


class NyanCatReporter {
  constructor(emitter, stats, tests) {
    let windowWidth;
    this.configureEmitter = this.configureEmitter.bind(this);
    this.draw = this.draw.bind(this);
    this.drawScoreboard = this.drawScoreboard.bind(this);
    this.appendRainbow = this.appendRainbow.bind(this);
    this.drawRainbow = this.drawRainbow.bind(this);
    this.drawNyanCat = this.drawNyanCat.bind(this);
    this.face = this.face.bind(this);
    this.cursorUp = this.cursorUp.bind(this);
    this.cursorDown = this.cursorDown.bind(this);
    this.cursorShow = this.cursorShow.bind(this);
    this.cursorHide = this.cursorHide.bind(this);
    this.rainbowify = this.rainbowify.bind(this);
    this.type = 'nyan';
    this.stats = stats;
    this.tests = tests;
    this.isatty = tty.isatty(1) && tty.isatty(2);
    if (this.isatty) {
      if (process.stdout.getWindowSize) {
        windowWidth = process.stdout.getWindowSize(1)[0];
      } else {
        windowWidth = tty.getWindowSize()[1];
      }
    } else {
      windowWidth = 75;
    }
    const width = (windowWidth * .75) | 0;
    this.rainbowColors = this.generateColors();
    this.colorIndex = 0;
    this.numberOfLines = 4;
    this.trajectories = [[], [], [], []];
    this.nyanCatWidth = 11;
    this.trajectoryWidthMax = (width - this.nyanCatWidth);
    this.scoreboardWidth = 5;
    this.tick = 0;
    this.errors = [];
    this.configureEmitter(emitter);
    logger.verbose(`Using '${this.type}' reporter.`);
  }

  configureEmitter(emitter) {
    emitter.on('start', (rawBlueprint, callback) => {
      this.cursorHide();
      this.draw();
      return callback();
    });

    emitter.on('end', callback => {
      this.cursorShow();
      let i = 0;

      while (i < this.numberOfLines) {
        this.write("\n");
        i++;
      }

      if (this.errors.length > 0) {
        this.write("\n");
        logger.info("Displaying failed tests...");
        for (let test of this.errors) {
          logger.fail(test.title + ` duration: ${test.duration}ms`);
          logger.fail(test.message);
          logger.request(`\n${prettifyResponse(test.request)}\n`);
          logger.expected(`\n${prettifyResponse(test.expected)}\n`);
          logger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
        }
      }

      logger.complete(`${this.stats.passes} passing, ${this.stats.failures} failing, ${this.stats.errors} errors, ${this.stats.skipped} skipped`);
      logger.complete(`Tests took ${this.stats.duration}ms`);
      return callback();
    });


    emitter.on('test pass', test => {
      return this.draw();
    });

    emitter.on('test skip', test => {
      return this.draw();
    });

    emitter.on('test fail', test => {
      this.errors.push(test);
      return this.draw();
    });

    return emitter.on('test error', (error, test) => {
      test.message = `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
      this.errors.push(test);
      return this.draw();
    });
  }

  draw() {
    this.appendRainbow();
    this.drawScoreboard();
    this.drawRainbow();
    this.drawNyanCat();
    return this.tick = !this.tick;
  }

  drawScoreboard() {
    const { write } = this;
    const draw = function(color, n) {
      write(" ");
      write(`\u001b[${color}m${n}\u001b[0m`);
      return write("\n");
    };
    const { stats } = this;
    const colors = {
      fail: 31,
      skipped: 36,
      pass: 32
    };

    draw(colors.pass, this.stats.passes);
    draw(colors.fail, this.stats.failures);
    draw(colors.fail, this.stats.errors);
    draw(colors.skipped, this.stats.skipped);

    this.write("\n");
    return this.cursorUp(this.numberOfLines + 1);
  }

  appendRainbow() {
    const segment = (this.tick ? "_" : "-");
    const rainbowified = this.rainbowify(segment);
    let index = 0;

    return (() => {
      const result = [];
      while (index < this.numberOfLines) {
        const trajectory = this.trajectories[index];
        if (trajectory.length >= this.trajectoryWidthMax) { trajectory.shift(); }
        trajectory.push(rainbowified);
        result.push(index++);
      }
      return result;
    })();
  }

  drawRainbow() {
    const { scoreboardWidth } = this;
    const { write } = this;
    this.trajectories.forEach(function(line, index) {
      write(`\u001b[${scoreboardWidth}C`);
      write(line.join(""));
      return write("\n");
    });

    return this.cursorUp(this.numberOfLines);
  }

  drawNyanCat() {
    const startWidth = this.scoreboardWidth + this.trajectories[0].length;
    const color = `\u001b[${startWidth}C`;
    let padding = "";
    this.write(color);
    this.write("_,------,");
    this.write("\n");
    this.write(color);
    padding = (this.tick ? "  " : "   ");
    this.write(`_|${padding}/\\_/\\ `);
    this.write("\n");
    this.write(color);
    padding = (this.tick ? "_" : "__");
    const tail = (this.tick ? "~" : "^");
    const face = undefined;
    this.write(tail + "|" + padding + this.face() + " ");
    this.write("\n");
    this.write(color);
    padding = (this.tick ? " " : "  ");
    this.write(padding + "\"\"  \"\" ");
    this.write("\n");
    return this.cursorUp(this.numberOfLines);
  }

  face() {
    const { stats } = this;
    if (stats.failures) {
      return "( x .x)";
    } else if (stats.skipped) {
      return "( o .o)";
    } else if (stats.passes) {
      return "( ^ .^)";
    } else {
      return "( - .-)";
    }
  }

  cursorUp(n) {
    return this.write(`\u001b[${n}A`);
  }

  cursorDown(n) {
    return this.write(`\u001b[${n}B`);
  }

  cursorShow() {
    return this.isatty && this.write('\u001b[?25h');
  }

  cursorHide() {
    return this.isatty && this.write('\u001b[?25l');
  }

  generateColors() {
    const colors = [];
    let i = 0;

    while (i < (6 * 7)) {
      const pi3 = Math.floor(Math.PI / 3);
      const n = (i * (1.0 / 6));
      const r = Math.floor((3 * Math.sin(n)) + 3);
      const g = Math.floor((3 * Math.sin(n + (2 * pi3))) + 3);
      const b = Math.floor((3 * Math.sin(n + (4 * pi3))) + 3);
      colors.push((36 * r) + (6 * g) + b + 16);
      i++;
    }
    return colors;
  }

  rainbowify(str) {
    const color = this.rainbowColors[this.colorIndex % this.rainbowColors.length];
    this.colorIndex += 1;
    return `\u001b[38;5;${color}m${str}\u001b[0m`;
  }


  write(str) {
    return process.stdout.write(str);
  }
}


module.exports = NyanCatReporter;
