/* eslint-disable
    no-return-assign,
    no-shadow,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const inquirerStub = require('inquirer');
const fsStub = require('fs');

const interactiveConfig = proxyquire('../../src/interactive-config', {
  inquirer: inquirerStub,
  fs: fsStub
});

describe('interactiveConfig', () => {
  it('exports a object', () => assert.isObject(interactiveConfig));


  describe('.prompt(config, callback)', () => {
    it('is a defined function', () => assert.isFunction(interactiveConfig.prompt));

    return describe('when I call it ', () =>

      it('should run inquirer', (done) => {
        sinon.stub(inquirerStub, 'prompt').callsFake(questions => ({ then(cb) { return cb(); } }));

        return interactiveConfig.prompt({}, () => {
          assert.isTrue(inquirerStub.prompt.called);
          return done();
        });
      })
    );
  });

  describe('.processAnswers(config, answers, callback)', () => {
    let answers = {};
    let config = {};

    describe('when no apiary config passed', () => {
      before(() => {
        answers = {
          blueprint: 'apiary.apib',
          server: 'rails server',
          endpoint: 'http://127.0.0.1:3000',
          apiary: true,
          apiaryApiKey: 'key',
          apiaryApiName: 'name',
          ciAdd: true
        };

        return config = {
          _: [],
          custom: {}
        };
      });

      return describe('config object passed to callback', () => {
        let object = {};

        before(done =>
          interactiveConfig.processAnswers(config, answers, (config) => {
            object = config;
            return done();
          })
        );

        return it('should have properties set from the config on proper places', () => {
          assert.equal(object._[0], 'apiary.apib');
          assert.equal(object._[1], 'http://127.0.0.1:3000');
          assert.equal(object.server, 'rails server');
          assert.equal(object.reporter, 'apiary');
          assert.equal(object.custom.apiaryApiKey, 'key');
          return assert.equal(object.custom.apiaryApiName, 'name');
        });
      });
    });

    return describe('when apiary config passed from cli', () => {
      before(() => {
        answers = {
          blueprint: 'apiary.apib',
          server: 'rails server',
          endpoint: 'http://127.0.0.1:3000',
          ciAdd: true
        };

        return config = {
          _: [],
          reporter: 'apiary',
          custom: {
            apiaryApiKey: '123123123',
            apiaryApiName: 'asdadqweqweq'
          }
        };
      });


      return describe('config object passed to callback', () => {
        let object = {};

        before(done =>
          interactiveConfig.processAnswers(config, answers, (config) => {
            object = config;
            return done();
          })
        );

        return it('should have properties set from the config on proper places', () => {
          assert.equal(object._[0], 'apiary.apib');
          assert.equal(object._[1], 'http://127.0.0.1:3000');

          assert.equal(object.reporter, 'apiary');
          assert.equal(object.custom.apiaryApiKey, '123123123');
          return assert.equal(object.custom.apiaryApiName, 'asdadqweqweq');
        });
      });
    });
  });

  describe('.run(config, callback)', () =>
    it('is a defined function', () => assert.isFunction(interactiveConfig.run))
  );


  describe('.updateCircle()', () => {
    beforeEach(() => sinon.stub(fsStub, 'writeFileSync'));

    afterEach(() => fsStub.writeFileSync.restore());

    it('should save the file', () => {
      interactiveConfig.updateCircle();
      return assert.isTrue(fsStub.writeFileSync.called);
    });

    return it('should save proper config', () => {});
  });

  return describe('.updateTravis()', () => {
    beforeEach(() => sinon.stub(fsStub, 'writeFileSync'));

    afterEach(() => fsStub.writeFileSync.restore());

    return it('should save the file', () => {
      interactiveConfig.updateTravis();
      return assert.isTrue(fsStub.writeFileSync.called);
    });
  });
});
