const sinon = require('sinon');
const { assert } = require('chai');

const Dredd = require('../../lib/Dredd');

const { _prefixErrors: prefixErrors, _toTransactions: toTransactions } = Dredd;


describe('Dredd._prefixErrors()', () => {
  describe('on error', () => {
    const error = new Error('Ouch!');
    const callback = sinon.stub();

    before(() => {
      const decoratedCallback = prefixErrors(callback, 'Fatal error');
      decoratedCallback(error);
    });

    it('calls the original callback', () => {
      assert.isTrue(callback.calledOnce);
    });
    it('passes the error to the original callback', () => {
      assert.strictEqual(callback.firstCall.args[0], error);
    });
    it('prefixes the error message', () => {
      assert.equal(callback.firstCall.args[0].message, 'Fatal error: Ouch!');
    });
  });

  describe('on success', () => {
    const callback = sinon.stub();

    before(() => {
      const decoratedCallback = prefixErrors(callback, 'Fatal error');
      decoratedCallback(null, 'arbitrary result');
    });

    it('calls the original callback', () => {
      assert.isTrue(callback.calledOnce);
    });
    it('passes no error to the original callback', () => {
      assert.isNull(callback.firstCall.args[0]);
    });
    it('passes additional arguments to the original callback', () => {
      assert.equal(callback.firstCall.args[1], 'arbitrary result');
    });
  });
});


describe('Dredd._toTransactions()', () => {
  const apiDescriptions = [
    {
      location: 'configuration.apiDescriptions[0]',
      content: '...',
      mediaType: 'text/vnd.apiblueprint',
      apiElements: { '...': '...' },
      transactions: [{ name: 'transaction 1' }],
    },
    {
      location: '/Users/honza/Projects/myapi/openapi.yml',
      content: '...',
      mediaType: 'application/swagger+json',
      apiElements: { '...': '...' },
      transactions: [{ name: 'transaction 2' }, { name: 'transaction 3' }],
    },
  ];

  it('transforms API descriptions array into an array of transactions', () => {
    assert.deepEqual(toTransactions(apiDescriptions), [
      {
        name: 'transaction 1',
        apiDescription: {
          location: 'configuration.apiDescriptions[0]',
          mediaType: 'text/vnd.apiblueprint',
        },
      },
      {
        name: 'transaction 2',
        apiDescription: {
          location: '/Users/honza/Projects/myapi/openapi.yml',
          mediaType: 'application/swagger+json',
        },
      },
      {
        name: 'transaction 3',
        apiDescription: {
          location: '/Users/honza/Projects/myapi/openapi.yml',
          mediaType: 'application/swagger+json',
        },
      },
    ]);
  });
});
