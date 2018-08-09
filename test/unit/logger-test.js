const { assert } = require('chai');

const logger = require('../../src/logger');

describe('Logger', () => {
  context('public interface', () => {
    it('should contain debug/error/info/warn/log/setLevel methods', () => {
      ['debug', 'error', 'info', 'warn', 'log', 'setLevel'].forEach((method) => {
        assert.equal('function', typeof logger[method]);
      });
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

    function writer(arg) {
      messages.push(arg);
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

        assert.deepEqual(messages, ['ERROR']);
      });
    });

    describe('when log level is set to warn', () => {
      it('should only log error and warn level messages', () => {
        const log = new logger.Logger({ level: 'warn', writer });

        log.error('ERROR');
        log.warn('WARN');
        log.info('INFO');
        log.debug('DEBUG');

        assert.deepEqual(messages, ['ERROR', 'WARN']);
      });
    });

    describe('when log level is set to info', () => {
      it('should only log error, warn, and info level messages', () => {
        const log = new logger.Logger({ level: 'info', writer });

        log.error('ERROR');
        log.warn('WARN');
        log.info('INFO');
        log.debug('DEBUG');

        assert.deepEqual(messages, ['ERROR', 'WARN', 'INFO']);
      });
    });

    describe('when log level is set to debug', () => {
      it('should log error, warn, info, and debug level messages', () => {
        const log = new logger.Logger({ level: 'debug', writer });

        log.error('ERROR');
        log.warn('WARN');
        log.info('INFO');
        log.debug('DEBUG');

        assert.deepEqual(messages, ['ERROR', 'WARN', 'INFO', 'DEBUG']);
      });
    });
  });
});
