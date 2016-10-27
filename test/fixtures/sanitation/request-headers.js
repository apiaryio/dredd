var hooks = require('hooks');
var caseless = require('caseless');

hooks.after('Resource > Update Resource', function(transaction, done) {
  var headers = transaction.test.request.headers;
  var name = caseless(headers).has('Authorization');
  delete headers[name];
  transaction.test.request.headers = headers;
  done();
});
