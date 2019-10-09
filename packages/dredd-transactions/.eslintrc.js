module.exports = {
  extends: 'airbnb-base',
  env: {
    'mocha': true,
    'node': true
  },
  rules: {
    // Node 6 does not support dangling commas in function arguments
    'comma-dangle': [
      'error',
      {
        'arrays': 'always-multiline',
        'objects': 'always-multiline',
        'functions': 'never'
      }
    ],

    // This is to allow a convention for exporting functions solely for
    // the purpose of the unit tests, see
    // https://github.com/apiaryio/dredd-transactions/pull/179#discussion_r206852270
    'no-underscore-dangle': 'off',
  }
};
