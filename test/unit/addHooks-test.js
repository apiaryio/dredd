const path = require('path');
const { assert } = require('chai');

const Hooks = require('../../lib/Hooks');
const addHooks = require('../../lib/addHooks');


const CWD = path.join(__dirname, '..', 'fixtures');

function createTransactionRunner() {
  return {
    configuration: {
      custom: { cwd: CWD },
      options: {},
    },
  };
}


describe('addHooks()', () => {
  it('sets transactionRunner.hooks', (done) => {
    const transactionRunner = createTransactionRunner();

    addHooks(transactionRunner, [], (err) => {
      assert.instanceOf(transactionRunner.hooks, Hooks);
      done(err);
    });
  });

  it('sets transactionRunner.hooks.transactions', (done) => {
    const transactionRunner = createTransactionRunner();
    const transaction1 = { name: 'My API > /resource/{id} > GET' };
    const transaction2 = { name: 'My API > /resources > POST' };

    addHooks(transactionRunner, [transaction1, transaction2], (err) => {
      assert.deepEqual(transactionRunner.hooks.transactions, {
        'My API > /resource/{id} > GET': transaction1,
        'My API > /resources > POST': transaction2,
      });
      done(err);
    });
  });

  it('sets transactionRunner.configuation.options.hookfiles', (done) => {
    const transactionRunner = createTransactionRunner();
    transactionRunner.configuration.options.hookfiles = [
      './multifile/*.apib',
      './apiary.apib',
    ];

    addHooks(transactionRunner, [], (err) => {
      assert.deepEqual(transactionRunner.configuration.options.hookfiles, [
        path.join(CWD, 'apiary.apib'),
        path.join(CWD, 'multifile/greeting.apib'),
        path.join(CWD, 'multifile/message.apib'),
        path.join(CWD, 'multifile/name.apib'),
      ]);
      done(err);
    });
  });

  it('propagates errors when resolving hookfiles is not possible', (done) => {
    const transactionRunner = createTransactionRunner();
    transactionRunner.configuration.options.hookfiles = [
      './__non-existing-directory__/non-existing-file.yml',
    ];

    addHooks(transactionRunner, [], (err) => {
      assert.instanceOf(err, Error);
      assert.match(err.message, /non-existing-file\.yml/);
      done();
    });
  });

  it('sets transactionRunner.hooks.configuation', (done) => {
    const transactionRunner = createTransactionRunner();

    addHooks(transactionRunner, [], (err) => {
      assert.deepEqual(
        transactionRunner.hooks.configuration,
        transactionRunner.configuration
      );
      done(err);
    });
  });
});
