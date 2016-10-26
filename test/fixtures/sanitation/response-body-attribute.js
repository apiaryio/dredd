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

  // sanitation of the attribute in validation output
  var validationOutput = transaction.test.results.body;

  var errors = [];
  for (var i = 0; i < validationOutput.results.length; i++) {
    if (validationOutput.results[i].pointer !== '/token') {
      errors.push(validationOutput.results[i]);
    }
  }
  validationOutput.results = errors;

  var rawData = [];
  for (var i = 0; i < validationOutput.rawData.length; i++) {
    if (validationOutput.rawData[i].property[0] !== 'token') {
      rawData.push(validationOutput.rawData[i]);
    }
  }
  validationOutput.rawData = rawData;

  transaction.test.message = '';
  done();
});
