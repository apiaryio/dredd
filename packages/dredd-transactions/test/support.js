const chai = require('chai');
const chaiJSONschema = require('chai-json-schema');

const fixtures = require('./fixtures');


chai.use(chaiJSONschema);


module.exports = { assert: chai.assert, fixtures };
