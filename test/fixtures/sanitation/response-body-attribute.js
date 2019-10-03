const hooks = require('hooks');

const unfold = (jsonString, transform) => JSON.stringify(transform(JSON.parse(jsonString)));

hooks.after('Resource > Update Resource', (transaction, done) => {
  const deleteToken = (obj) => {
    delete obj.token;
    return obj;
  };

  // Removes sensitive data from the Dredd transaction
  transaction.test.actual.body = unfold(transaction.test.actual.body, deleteToken);
  transaction.test.expected.body = unfold(transaction.test.expected.body, deleteToken);

  // Sanitation of the attribute in JSON Schema
  const bodySchema = JSON.parse(transaction.test.expected.bodySchema);
  delete bodySchema.properties.token;
  transaction.test.expected.bodySchema = JSON.stringify(bodySchema);

  // Removes sensitive data from the Gavel validation result
  const bodyResult = transaction.test.results.fields.body;
  bodyResult.errors = bodyResult.errors.filter(error => error.location.pointer !== '/token');
  bodyResult.values.expected = unfold(bodyResult.values.expected, deleteToken);
  bodyResult.values.actual = unfold(bodyResult.values.actual, deleteToken);

  transaction.test.message = '';
  done();
});
