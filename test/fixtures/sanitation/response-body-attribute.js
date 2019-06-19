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
  // TODO
  // Why do we even assert Gavel's output here?
  // If custom transformations are needed:
  // 1. Create a transformer function.
  // 2. Test is on _assumed_ Gavel output.
  // 3. Assert transformed output in sanitization tests, if any.
  for (let i = 0; i < validationOutput.errors.length; i++) {
    if (validationOutput.errors[i].pointer !== '/token') {
      errors.push(validationOutput.errors[i]);
    }
  }
  validationOutput.errors = errors;

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
