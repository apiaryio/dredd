const EventEmitter = require('events');
const sinon = require('sinon');
const { setWorldConstructor } = require('cucumber');


const API_DESCRIPTION_EXTS = {
  'text/vnd.apiblueprint': '.apib',
  'application/swagger+yaml': '.openapi2.yaml',
  'application/vnd.oai.openapi': '.openapi3.yaml',
};

const HOOKS_EXTS = {
  'text/vnd.apiblueprint': '.apib.js',
  'application/swagger+yaml': '.openapi2.js',
  'application/vnd.oai.openapi': '.openapi3.js',
};


function DreddWorld({ attach, parameters }) {
  this.attach = attach;
  this.parameters = parameters;

  this.apiDescriptionFormat = parameters.apiDescriptionFormat || 'text/vnd.apiblueprint';
  this.apiDescriptionExt = API_DESCRIPTION_EXTS[this.apiDescriptionFormat];
  this.hooksExt = HOOKS_EXTS[this.apiDescriptionFormat];

  // This is currently the best way the tests can spy on what Dredd is doing
  // when it's running. We provide Dredd with a custom EventEmitter instance,
  // on which it fires events, and we spy on the 'emit()' function to see what
  // has been emitted and with which arguments.
  this.events = new EventEmitter();
  sinon.spy(this.events, 'emit');

  this.config = {
    emitter: this.events,
    endpoint: 'http://127.0.0.1:3000',
    loglevel: 'debug',
    options: {},
  };
}


setWorldConstructor(DreddWorld);
