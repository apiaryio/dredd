const hooks = require('hooks');

hooks.before('Articles > Publish an article', (transaction) => {
  transaction.request.headers.Authorization = 'Basic: YWxhZGRpbjpvcGVuc2VzYW1l';
});
