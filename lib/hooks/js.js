const proxyquire = require('proxyquire').noCallThru();

const hooks = require('./index');


function js(filenames) {
  // very ugly side-effect!
  filenames.forEach(filename => proxyquire(filename, { hooks }));
  const hooksRegister = [].concat(hooks._register);

  console.log(hooksRegister);
  return () => {

  }
}


module.exports = js;


js(['./hooks1.js', './hooks2.js']);
