const hooks = require('hooks');

hooks.before('Articles > Publish an article > 201 > application/json; charset=utf-8', (transaction) => {
  transaction.request.headers.Authorization = 'Basic: YWxhZGRpbjpvcGVuc2VzYW1l';
});
