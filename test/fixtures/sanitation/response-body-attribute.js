var hooks = require('hooks');

hooks.after('Resource > Update Resource', function(transaction, done) {
  // sanitation of the attribute in body
  var body;

  body = JSON.parse(transaction.test.actual.body);
  delete body.token;
  transaction.test.actual.body = JSON.stringify(body);

  body = JSON.parse(transaction.test.expected.body);
  delete body.token;
  transaction.test.expected.body = JSON.stringify(body);

  // sanitation of the attribute in JSON Schema
  var bodySchema = JSON.parse(transaction.test.expected.bodySchema);
  delete bodySchema.properties.token;
  transaction.test.expected.bodySchema = JSON.stringify(bodySchema);

  // sanitation of the attribute in validation result
  var validationResult = transaction.test.results.body;

  var errors = [];
  for (var i = 0; i < validationResult.length; i++) {
    if (validationResult.results[i].pointer[0] !== 'token') {
      errors.push(validationResult.results[i]);
    }
  }
  validationResult.results = errors;

  var rawData = [];
  for (var i = 0; i < validationResult.rawData.length; i++) {
    if (validationResult.rawData[i].property[0] !== 'token') {
      rawData.push(validationResult.rawData[i]);
    }
  }
  validationResult.rawData = rawData;

  transaction.test.message = '';
  done();
});
