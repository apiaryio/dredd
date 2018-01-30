const {assert} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {EventEmitter} = require('events');
const loggerStub = require('../../../src/logger');
const BaseReporter = proxyquire('../../../src/reporters/base-reporter', {
  './../logger' : loggerStub
});

describe('BaseReporter', function() {

  let stats = {};
  let tests = [];
  let test = {};
  let emitter = {};
  let baseReporter = {};

  beforeEach(function() {
    stats = {
      tests: 0,
      failures: 0,
      errors: 0,
      passes: 0,
      skipped: 0,
      start: 0,
      end: 0,
      duration: 0
    };
    tests = [];
    emitter = new EventEmitter();
    return baseReporter = new BaseReporter(emitter, stats, tests);
  });

  describe('when starting', function() {

    before(() =>
      stats =
        {start: null}
    );

    return it('should set the start date', done =>
      emitter.emit('start', '', function() {
        assert.isOk(stats.start);
        return done();
      })
    );
  });

  describe('when ending', function() {

    before(() =>
      stats =
        {end: null}
    );

    return it('should set the end date', done =>
      emitter.emit('end', function() {
        assert.isOk(stats.end);
        return done();
      })
    );
  });

  describe('when test starts', function() {

    before(() =>
      test = {
        status: 'pass',
        title: 'Passing Test'
      }
    );

    return it('should add the test', function() {
      emitter.emit('test start', test);
      return assert.isOk(tests.length === 1);
    });
  });

  describe('when test passes', function() {

    beforeEach(function() {
      test = {
        status: 'pass',
        title: 'Passing Test'
      };
      emitter.emit('test start', test);
      return emitter.emit('test pass', test);
    });

    it('should increment the counter', () => assert.equal(stats.passes, 1));

    return it('should set the end time', () => assert.isOk(tests[0].end));
  });

  describe('when test is skipped', function() {
    beforeEach(function() {
      test = {
        status: 'skipped',
        title: 'Skipped Test'
      };
      emitter.emit('test start', test);
      return emitter.emit('test skip', test);
    });

    return it('should increment the counter', () => assert.isOk(stats.skipped === 1));
  });

  describe('when test fails', function() {

    beforeEach(function() {
      test = {
        status: 'failed',
        title: 'Failed Test'
      };
      emitter.emit('test start', test);
      return emitter.emit('test fail', test);
    });

    it('should increment the counter', () => assert.isOk(stats.failures === 1));

    return it('should set the end time', () => assert.isOk(tests[0].end));
  });

  describe('when test errors', function() {

    beforeEach(function() {
      test = {
        status: 'error',
        title: 'Errored Test'
      };
      emitter.emit('test start', test);
      return emitter.emit('test error', new Error('Error'), test);
    });

    it('should increment the counter', () => assert.isOk(stats.errors === 1));

    return it('should set the end time', () => assert.isOk(tests[0].end));
  });

  describe('when passing test start is UTC string', function() {

    beforeEach(function() {
      test = {
        status: 'pass',
        title: 'Passing Test'
      };
      emitter.emit('test start', test);
      test.start = '2017-06-15T09:29:50.588Z';
      return emitter.emit('test pass', test);
    });

    return it('should set the duration', () => assert.isNotNaN(tests[0].duration));
  });

  describe('when failed test start is UTC string', function() {

    beforeEach(function() {
      test = {
        status: 'pass',
        title: 'Failed Test'
      };
      emitter.emit('test start', test);
      test.start = '2017-06-15T09:29:50.588Z';
      return emitter.emit('test fail', test);
    });

    return it('should set the duration', () => assert.isNotNaN(tests[0].duration));
  });

  return describe('when errored test start is UTC string', function() {

    beforeEach(function() {
      test = {
        status: 'pass',
        title: 'Errored Test'
      };
      emitter.emit('test start', test);
      test.start = '2017-06-15T09:29:50.588Z';
      return emitter.emit('test error', new Error('Error'), test);
    });

    return it('should set the duration', () => assert.isNotNaN(tests[0].duration));
  });
});
