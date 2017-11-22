const cpy = require('cpy'); // eslint-disable-line

const files = [
  'test/**/*.apib',
  'test/**/*.coffee',
  'test/**/*.js',
  'test/**/*.yml'
];

cpy(files, 'dist/', { parents: true }, (err) => {
  if (err) console.log(err.message);
});
