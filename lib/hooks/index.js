const _register = [];


function beforeAll(hookFunction) {
  _register.push({ name: 'beforeAll', hookFunction });
}

function beforeEach(hookFunction) {
  _register.push({ name: 'beforeEach', hookFunction });
}

function before(transactionName, hookFunction) {
  _register.push({ name: 'before', transactionName, hookFunction });
}

function beforeEachValidation(hookFunction) {
  _register.push({ name: 'beforeEachValidation', hookFunction });
}

function beforeValidation(transactionName, hookFunction) {
  _register.push({ name: 'beforeValidation', transactionName, hookFunction });
}

function after(transactionName, hookFunction) {
  _register.push({ name: 'after', transactionName, hookFunction });
}

function afterEach(hookFunction) {
  _register.push({ name: 'afterEach', hookFunction });
}

function afterAll(hookFunction) {
  _register.push({ name: 'afterAll', hookFunction });
}


module.exports = {
  _register,
  beforeAll,
  beforeEach,
  before,
  beforeEachValidation,
  beforeValidation,
  after,
  afterEach,
  afterAll,
};
