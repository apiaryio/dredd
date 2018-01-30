const caseless = require('caseless');
const hooks = require('hooks');

hooks.after('Resource > Update Resource', (transaction, done) => {
  let headers;
  let name;

  headers = transaction.test.actual.headers;
  name = caseless(headers).has('authorization');
  delete headers[name];
  transaction.test.actual.headers = headers;

  headers = transaction.test.expected.headers;
  name = caseless(headers).has('authorization');
  delete headers[name];
  transaction.test.expected.headers = headers;

  // Sanitation of the header in validation output
  const validationOutput = transaction.test.results.headers;

  const errors = [];
  for (let i = 0; i < validationOutput.results.length; i++) {
    if (validationOutput.results[i].pointer.toLowerCase() !== '/authorization') {
      errors.push(validationOutput.results[i]);
    }
  }
  validationOutput.results = errors;

  const rawData = [];
  for (let i = 0; i < validationOutput.rawData.length; i++) {
    if (validationOutput.rawData[i].property[0].toLowerCase() !== 'authorization') {
      rawData.push(validationOutput.rawData[i]);
    }
  }
  validationOutput.rawData = rawData;

  transaction.test.message = '';
  done();
});
