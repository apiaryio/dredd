const hooks = require('hooks');

hooks.after('Resource > Update Resource', (transaction, done) => {
  // Sanitation of the attribute in body
  let body;

  body = JSON.parse(transaction.test.actual.body);
  delete body.token;
  transaction.test.actual.body = JSON.stringify(body);

  body = JSON.parse(transaction.test.expected.body);
  delete body.token;
  transaction.test.expected.body = JSON.stringify(body);

  // Sanitation of the attribute in JSON Schema
  const bodySchema = JSON.parse(transaction.test.expected.bodySchema);
  delete bodySchema.properties.token;
  transaction.test.expected.bodySchema = JSON.stringify(bodySchema);

  // Sanitation of the attribute in validation output
  const validationOutput = transaction.test.results.body;

  const errors = [];
  for (let i = 0; i < validationOutput.results.length; i++) {
    if (validationOutput.results[i].pointer !== '/token') {
      errors.push(validationOutput.results[i]);
    }
  }
  validationOutput.results = errors;

  const rawData = [];
  for (let i = 0; i < validationOutput.rawData.length; i++) {
    if (validationOutput.rawData[i].property[0] !== 'token') {
      rawData.push(validationOutput.rawData[i]);
    }
  }
  validationOutput.rawData = rawData;

  transaction.test.message = '';
  done();
});
