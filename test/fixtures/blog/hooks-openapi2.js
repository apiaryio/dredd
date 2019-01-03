const hooks = require('hooks');

hooks.before('Articles > Publish an article > 201 > application/json', (transaction) => {
  transaction.request.headers.Authorization = 'Basic: YWxhZGRpbjpvcGVuc2VzYW1l';
});
