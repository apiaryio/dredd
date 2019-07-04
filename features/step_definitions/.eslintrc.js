module.exports = {
  rules: {
    // prevents warnings in step definitions, where it makes no sense to give
    // a name to every function and where we need the function expression
    // to have access to 'this'
    'func-names': 'off',

    // prevents warnings in assertions using 'expect()'
    'no-unused-expressions': 'off',
  }
};
