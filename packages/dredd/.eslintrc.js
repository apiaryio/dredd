module.exports = {
  extends: ['airbnb-base', 'prettier'],
  env: {
    node: true,
  },
  rules: {
    // Using 'console' is perfectly okay for a Node.js CLI tool and avoiding
    // it only brings unnecessary complexity
    'no-console': 'off',

    // This is to allow a convention for exporting functions solely for
    // the purpose of the unit tests, see
    // https://github.com/apiaryio/dredd-transactions/pull/179#discussion_r206852270
    'no-underscore-dangle': 'off',

    // Following rules were introduced to make the decaffeination
    // of the codebase possible and are to be removed in the future
    'class-methods-use-this': 'off',
    'consistent-return': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'max-len': 'off',
    'no-continue': 'off',
    'no-empty': 'off',
    'no-multi-assign': 'off',
    'no-new': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'no-use-before-define': 'off',
    'prefer-destructuring': 'off',
  },
};
