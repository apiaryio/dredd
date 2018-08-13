const { assert } = require('chai');

const logger = require('../../src/logger');

describe('Logger', () => {
  context('public interface', () => {
    it('should contain debug/error/info/warn/log methods', () => {
      ['debug', 'error', 'info', 'warn', 'log'].forEach((method) => {
        assert.equal('function', typeof logger[method]);
      });
    });

    it('should contain pass/fail/skip/expected/actual/request/complete methods', () => {
      ['pass', 'fail', 'skip', 'expected', 'actual', 'request', 'complete'].forEach((method) => {
        assert.equal('function', typeof logger[method]);
      });
    });

    it('should contain set method', () => {
      assert.equal('function', typeof logger.set);
    });

    it('should be possible to create multiple logger instances', () => {
      const log1 = new logger.Logger();
      const log2 = new logger.Logger();

      assert.isTrue(log1 instanceof logger.Logger);
      assert.isTrue(log2 instanceof logger.Logger);
    });

    it('should set default log level to error', () => {
      const log = new logger.Logger();

      assert.equal(log.level, 'error');
    });

    it('should be possible to set custom log level', () => {
      const log = new logger.Logger({ level: 'debug' });

      assert.equal(log.level, 'debug');
    });

    it('should be possible to set custom writer', () => {
      function writer() {}
      const log = new logger.Logger({ writer });

      assert.equal(log.writer, writer);
    });

    it('should be possible to set custom output stream', () => {
      const log = new logger.Logger({ output: 'STDOUT' });

      assert.equal(log.output, 'stdout');
    });
  });

  context('log levels', () => {
    let messages;

    function writer(...args) {
      messages.push(args.join(' '));
    }

    beforeEach(() => {
      messages = [];
    });

    describe('when log level is set to error', () => {
      it('should only log error level message', () => {
        const log = new logger.Logger({ level: 'error', writer });

        log.error('ERROR');
        log.warn('WARN');
        log.info('INFO');
        log.debug('DEBUG');

        assert.deepEqual(messages, ['error: ERROR']);
      });
    });

    describe('when log level is set to warn', () => {
      it('should only log error and warn level messages', () => {
        const log = new logger.Logger({ level: 'warn', writer });

        log.error('ERROR');
        log.warn('WARN');
        log.info('INFO');
        log.debug('DEBUG');

        assert.deepEqual(messages, ['error: ERROR', 'warn: WARN']);
      });
    });

    describe('when log level is set to info', () => {
      it('should only log error, warn, and info level messages', () => {
        const log = new logger.Logger({ level: 'info', writer });

        log.error('ERROR');
        log.warn('WARN');
        log.info('INFO');
        log.debug('DEBUG');

        assert.deepEqual(
          messages,
          ['error: ERROR', 'warn: WARN', 'info: INFO']
        );
      });
    });

    describe('when log level is set to debug', () => {
      it('should log error, warn, info, and debug level messages', () => {
        const log = new logger.Logger({ level: 'debug', writer });

        log.error('ERROR');
        log.warn('WARN');
        log.info('INFO');
        log.debug('DEBUG');

        assert.deepEqual(
          messages,
          ['error: ERROR', 'warn: WARN', 'info: INFO', 'debug: DEBUG']
        );
      });
    });
  });

  context('timestamp', () => {
    let messages;

    function writer(...args) {
      messages.push(args.join(' '));
    }

    beforeEach(() => {
      messages = [];
    });

    describe('when timestamp option is not enabled', () => {
      it('should not be possible to see timestamp string in the log', () => {
        const log = new logger.Logger({ level: 'error', writer });
        log.error('ERROR');
        assert.notInclude(messages[0], ['Z']);
      });
    });

    describe('when timestamp option is enabled', () => {
      it('should be possible to see timestamp string in the log', () => {
        const log = new logger.Logger({ level: 'error', timestamp: true, writer });
        log.error('ERROR');
        assert.include(messages[0], ['Z']);
      });
    });
  });
});
