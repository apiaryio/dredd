import tty from 'tty';

import logger from '../logger';
import prettifyResponse from '../prettifyResponse';
import reporterOutputLogger from './reporterOutputLogger';

function NyanCatReporter(emitter, stats) {
  let windowWidth;

  this.type = 'nyan';
  this.stats = stats;
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

  this.rainbowColors = this.generateColors();
  this.colorIndex = 0;
  this.numberOfLines = 4;
  this.trajectories = [[], [], [], []];
  this.nyanCatWidth = 11;
  this.trajectoryWidthMax = ((windowWidth * 0.75) | 0) - this.nyanCatWidth; // eslint-disable-line no-bitwise
  this.scoreboardWidth = 5;
  this.tick = 0;
  this.errors = [];

  this.configureEmitter(emitter);

  logger.debug(`Using '${this.type}' reporter.`);
}

NyanCatReporter.prototype.configureEmitter = function configureEmitter(
  emitter,
) {
  emitter.on('start', (apiDescriptions, callback) => {
    this.cursorHide();
    this.draw();
    callback();
  });

  emitter.on('end', (callback) => {
    this.cursorShow();
    let i = 0;

    while (i < this.numberOfLines) {
      this.write('\n');
      i++;
    }

    if (this.errors.length > 0) {
      this.write('\n');
      reporterOutputLogger.info('Displaying failed tests...');
      for (const test of this.errors) {
        reporterOutputLogger.fail(`${test.title} duration: ${test.duration}ms`);
        reporterOutputLogger.fail(test.message);
        reporterOutputLogger.request(`\n${prettifyResponse(test.request)}\n`);
        reporterOutputLogger.expected(`\n${prettifyResponse(test.expected)}\n`);
        reporterOutputLogger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
      }
    }

    reporterOutputLogger.complete(
      `${this.stats.passes} passing, ${this.stats.failures} failing, ${this.stats.errors} errors, ${this.stats.skipped} skipped`,
    );
    reporterOutputLogger.complete(`Tests took ${this.stats.duration}ms`);
    callback();
  });

  emitter.on('test pass', () => {
    this.draw();
  });

  emitter.on('test skip', () => {
    this.draw();
  });

  emitter.on('test fail', (test) => {
    this.errors.push(test);
    this.draw();
  });

  emitter.on('test error', (error, test) => {
    test.message = `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
    this.errors.push(test);
    this.draw();
  });
};

NyanCatReporter.prototype.draw = function draw() {
  this.appendRainbow();
  this.drawScoreboard();
  this.drawRainbow();
  this.drawNyanCat();
  this.tick = !this.tick;
};

NyanCatReporter.prototype.drawScoreboard = function drawScoreboard() {
  const colors = {
    fail: 31,
    skipped: 36,
    pass: 32,
  };

  // Capture outer `this`
  const draw = (color, n) => {
    this.write(' ');
    this.write(`\u001b[${color}m${n}\u001b[0m`);
    this.write('\n');
  };

  draw(colors.pass, this.stats.passes);
  draw(colors.fail, this.stats.failures);
  draw(colors.fail, this.stats.errors);
  draw(colors.skipped, this.stats.skipped);

  this.write('\n');
  this.cursorUp(this.numberOfLines + 1);
};

NyanCatReporter.prototype.appendRainbow = function appendRainbow() {
  const segment = this.tick ? '_' : '-';
  const rainbowified = this.rainbowify(segment);
  const result = [];

  let index = 0;
  while (index < this.numberOfLines) {
    const trajectory = this.trajectories[index];
    if (trajectory.length >= this.trajectoryWidthMax) {
      trajectory.shift();
    }
    trajectory.push(rainbowified);
    result.push(index++);
  }
  return result;
};

NyanCatReporter.prototype.drawRainbow = function drawRainbow() {
  this.trajectories.forEach((line) => {
    this.write(`\u001b[${this.scoreboardWidth}C`);
    this.write(line.join(''));
    this.write('\n');
  });

  this.cursorUp(this.numberOfLines);
};

NyanCatReporter.prototype.drawNyanCat = function drawNyanCat() {
  const startWidth = this.scoreboardWidth + this.trajectories[0].length;
  const color = `\u001b[${startWidth}C`;
  let padding = '';
  this.write(color);
  this.write('_,------,');
  this.write('\n');
  this.write(color);
  padding = this.tick ? '  ' : '   ';
  this.write(`_|${padding}/\\_/\\ `);
  this.write('\n');
  this.write(color);
  padding = this.tick ? '_' : '__';
  const tail = this.tick ? '~' : '^';
  this.write(`${tail}|${padding}${this.face()} `);
  this.write('\n');
  this.write(color);
  padding = this.tick ? ' ' : '  ';
  this.write(`${padding}''  '' `);
  this.write('\n');
  this.cursorUp(this.numberOfLines);
};

NyanCatReporter.prototype.face = function face() {
  if (this.stats.failures) {
    return '( x .x)';
  }
  if (this.stats.skipped) {
    return '( o .o)';
  }
  if (this.stats.passes) {
    return '( ^ .^)';
  }
  return '( - .-)';
};

NyanCatReporter.prototype.cursorUp = function cursorUp(n) {
  this.write(`\u001b[${n}A`);
};

NyanCatReporter.prototype.cursorDown = function cursorDown(n) {
  this.write(`\u001b[${n}B`);
};

NyanCatReporter.prototype.cursorShow = function cursorShow() {
  if (this.isatty) {
    this.write('\u001b[?25h');
  }
};

NyanCatReporter.prototype.cursorHide = function cursorHide() {
  if (this.isatty) {
    this.write('\u001b[?25l');
  }
};

NyanCatReporter.prototype.generateColors = function generateColors() {
  const colors = [];
  let i = 0;

  while (i < 6 * 7) {
    const pi3 = Math.floor(Math.PI / 3);
    const n = i * (1.0 / 6);
    const r = Math.floor(3 * Math.sin(n) + 3);
    const g = Math.floor(3 * Math.sin(n + 2 * pi3) + 3);
    const b = Math.floor(3 * Math.sin(n + 4 * pi3) + 3);
    colors.push(36 * r + 6 * g + b + 16);
    i++;
  }
  return colors;
};

NyanCatReporter.prototype.rainbowify = function rainbowify(str) {
  const color = this.rainbowColors[this.colorIndex % this.rainbowColors.length];
  this.colorIndex += 1;
  return `\u001b[38;5;${color}m${str}\u001b[0m`;
};

NyanCatReporter.prototype.write = function write(str) {
  process.stdout.write(str);
};

export default NyanCatReporter;
