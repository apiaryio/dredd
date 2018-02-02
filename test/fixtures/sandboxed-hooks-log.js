/* eslint-disable no-undef */

before('Machines > Machines collection > Get Machines', () => {
  log('shall not print, but be present in logs');
});

after('Machines > Machines collection > Get Machines', () => {
  log('using sandboxed hooks.log');
});
