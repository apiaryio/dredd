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

  this.dredd = {
    apiDescription: null,
    apiLocation: 'http://127.0.0.1:3000',
    args: [],
    output: '',
    exitStatus: null,
  };
}


setWorldConstructor(DreddWorld);
