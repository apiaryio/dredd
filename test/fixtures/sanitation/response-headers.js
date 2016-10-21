var hooks = require('hooks');
var caseless = require('caseless');

hooks.after('Resource > Update Resource', function(transaction, done) {
  var headers;
  var name;

  headers = transaction.test.actual.headers;
  name = caseless(headers).has('authorization');
  delete headers[name];
  transaction.test.actual.headers = headers;

  headers = transaction.test.expected.headers;
  name = caseless(headers).has('authorization');
  delete headers[name];
  transaction.test.expected.headers = headers;

  // sanitation of the header in validation result
  var validationResult = transaction.test.results.headers;

  var errors = [];
  for (var i = 0; i < validationResult.length; i++) {
    if (validationResult.results[i].pointer[0].toLowerCase() !== 'authorization') {
      errors.push(validationResult.results[i]);
    }
  }
  validationResult.results = errors;

  var rawData = [];
  for (var i = 0; i < validationResult.rawData.length; i++) {
    if (validationResult.rawData[i].property[0].toLowerCase() !== 'authorization') {
      rawData.push(validationResult.rawData[i]);
    }
  }
  validationResult.rawData = rawData;

  transaction.test.message = '';
  done();
});
