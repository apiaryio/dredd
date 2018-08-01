module.exports = {
  extends: 'airbnb/base',
  env: {
    'browser': true,
    'mocha': true,
    'node': true
  },
  rules: {
    'comma-dangle': ['error', 'never'],
    'no-underscore-dangle': 'off', // https://github.com/apiaryio/dredd-transactions/pull/179#discussion_r206852270
  }
};
