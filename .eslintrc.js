module.exports = {
  extends: 'airbnb/base',
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
    'max-len': 'off',
    'no-bitwise': 'off',
    'no-continue': 'off',
    'no-empty': 'off',
    'no-multi-assign': 'off',
    'no-new': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off'
  }
};
