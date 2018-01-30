const {assert} = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const clone = require('clone');

const fsStub = require('fs');

const yamlStub = require('js-yaml');

const configUtils = proxyquire('../../src/config-utils', {
  'fs': fsStub,
  'js-yaml': yamlStub
});

const argvData = {
  "_": [ 'blueprint', 'endpoint' ],
  'dry-run': true,
  y: true,
  hookfiles: null,
  f: null,
  sandbox: false,
  b: false,
  save: null,
  z: null,
  load: null,
  a: null,
  server: null,
  g: null,
  init: false,
  i: false,
  custom: [],
  j: [],
  names: false,
  n: false,
  only: [],
  x: [],
  reporter: [],
  r: [],
  output: [],
  o: [],
  header: [],
  h: [],
  sorted: false,
  s: false,
  user: null,
  u: null,
  'inline-errors': false,
  e: false,
  details: false,
  d: false,
  method: [],
  m: [],
  color: true,
  c: true,
  level: 'info',
  l: 'info',
  timestamp: false,
  t: false,
  silent: false,
  q: false,
  path: [],
  p: [],
  '$0': 'node ./bin/dredd'
};

describe('configUtils', function() {
  let argv = null;
  beforeEach(() => argv = clone(argvData));

  it('it should export an object', () => assert.isObject(configUtils));

  describe('save(args, path)', function() {
    beforeEach(function() {
      sinon.stub(fsStub, 'writeFileSync');
      return sinon.spy(yamlStub, 'safeDump');
    });

    afterEach(function() {
      fsStub.writeFileSync.restore();
      return yamlStub.safeDump.restore();
    });

    it('should be a defined function', () => assert.isFunction(configUtils.save));

    it('should add endpoint key', function() {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      return assert.property(yamlStub.safeLoad(args[1]), 'endpoint');
    });

    it('should add blueprint key', function() {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      return assert.property(yamlStub.safeLoad(args[1]), 'blueprint');
    });

    it('should remove aliases', function() {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      assert.notProperty(yamlStub.safeLoad(args[1]), 'p');
      return assert.notProperty(yamlStub.safeLoad(args[1]), 'q');
    });

    it('should remove _', function() {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      return assert.notProperty(yamlStub.safeLoad(args[1]), '_');
    });

    it('should remove $0', function() {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      return assert.notProperty(yamlStub.safeLoad(args[1]), '_');
    });

    it('should save an object', function() {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      return assert.notProperty(yamlStub.safeLoad(args[1]), '_');
    });

    it('should call YAML.dump', function() {
        let call;
        configUtils.save(argv);
        return call = yamlStub.safeDump.called;
    });

    describe('when path is not given', () =>
      it('should save to ./dredd.yml', function() {
        configUtils.save(argv);
        const call = fsStub.writeFileSync.getCall(0);
        const { args } = call;
        return assert.include(args[0], 'dredd.yml');
      })
    );


    return describe('when path is given', () =>
      it('should save to that path', function() {
        const path = 'some-other-location.yml ';
        configUtils.save(argv, path);
        const call = fsStub.writeFileSync.getCall(0);
        const { args } = call;
        return assert.include(args[0], path);
      })
    );
  });

  describe('load(path)', function() {

    const yamlData = `\
dry-run: true
hookfiles: null
sandbox: false
save: null
load: null
server: null
init: false
custom: []
names: false
only: []
reporter: []
output: []
header: []
sorted: false
user: null
inline-errors: false
details: false
method: []
color: true
level: info
timestamp: false
silent: false
path: []
blueprint: blueprint
endpoint: endpoint\
`;

    beforeEach(() => sinon.stub(fsStub, 'readFileSync').callsFake(file => yamlData));

    afterEach(() => fsStub.readFileSync.restore());

    it('should be a defined function', () => assert.isFunction(configUtils.load));

    describe('if no path is given', () =>
      it('should load from ./dredd.yml', function() {
        configUtils.load();
        const call = fsStub.readFileSync.getCall(0);
        const { args } = call;
        return assert.include(args[0], 'dredd.yml');
      })
    );

    describe('when path is given', () =>
      it('should load from that path', function() {
        const path = 'some-other-location.yml ';
        configUtils.load(path);
        const call = fsStub.readFileSync.getCall(0);
        const { args } = call;
        return assert.include(args[0], path);
      })
    );

    it('should move blueprint and enpoint to an array under _ key', function() {
      const output = configUtils.load();
      assert.isArray(output["_"]);
      assert.equal(output["_"][0], 'blueprint');
      return assert.equal(output["_"][1], 'endpoint');
    });

    it('should remove blueprint and endpoint keys', function() {
      const output = configUtils.load();
      assert.notProperty(output, 'blueprint');
      return assert.notProperty(output, 'endpoint');
    });

    return it('should return an object', function() {
      const output = configUtils.load();
      return assert.isObject(output);
    });
  });

  return describe('parseCustom(arrayOfCustoms)', function() {
    const custom = [
      "customOpt:itsValue:can:contain:delimiters",
      "customOpt2:itsValue"
    ];

    it('shold return an obejct', function() {
      let output = configUtils.parseCustom(custom);
      return output = {};
  });

    return it('should split values by first ":"', function() {
      const output = configUtils.parseCustom(custom);

      assert.property(output, 'customOpt');
      assert.property(output, 'customOpt2');
      assert.equal(output['customOpt'], 'itsValue:can:contain:delimiters');
      return assert.equal(output['customOpt2'], 'itsValue');
    });
  });
});
