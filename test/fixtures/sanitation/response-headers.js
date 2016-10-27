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

  // sanitation of the header in validation output
  var validationOutput = transaction.test.results.headers;

  var errors = [];
  for (var i = 0; i < validationOutput.results.length; i++) {
    if (validationOutput.results[i].pointer.toLowerCase() !== '/authorization') {
      errors.push(validationOutput.results[i]);
    }
  }
  validationOutput.results = errors;

  var rawData = [];
  for (var i = 0; i < validationOutput.rawData.length; i++) {
    if (validationOutput.rawData[i].property[0].toLowerCase() !== 'authorization') {
      rawData.push(validationOutput.rawData[i]);
    }
  }
  validationOutput.rawData = rawData;

  transaction.test.message = '';
  done();
});
