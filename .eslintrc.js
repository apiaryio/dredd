module.exports = {
  extends: 'airbnb-base',
  env: {
    'browser': true,
    'mocha': true,
    'node': true
  },
  rules: {
    'class-methods-use-this': 'off',
    'comma-dangle': ['error', 'never'],
    'consistent-return': 'off',
    'func-names': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'max-len': 'off',
    'no-bitwise': 'off',
    'no-continue': 'off',
    'no-empty': 'off',
    'no-multi-assign': 'off',
    'no-new': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'no-underscore-dangle': 'off', // https://github.com/apiaryio/dredd-transactions/pull/179#discussion_r206852270
    'no-use-before-define': 'off'
  }
};
