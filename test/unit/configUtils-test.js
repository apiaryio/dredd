import clone from 'clone';
import fsStub from 'fs';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import * as yamlStub from 'js-yaml';
import { assert } from 'chai';

const configUtils = proxyquire('../../lib/configUtils', {
  fs: fsStub,
  'js-yaml': yamlStub,
});

const argvData = {
  _: ['blueprint', 'endpoint'],
  'dry-run': true,
  y: true,
  hookfiles: null,
  f: null,
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
  loglevel: 'warning',
  l: 'warning',
  path: [],
  p: [],
  $0: 'node ./bin/dredd',
};

describe('configUtils', () => {
  let argv = null;
  beforeEach(() => {
    argv = clone(argvData);
  });

  it('it should export an object', () => assert.isObject(configUtils));

  describe('save(args, path)', () => {
    beforeEach(() => {
      sinon.stub(fsStub, 'writeFileSync');
      sinon.spy(yamlStub, 'dump');
    });

    afterEach(() => {
      fsStub.writeFileSync.restore();
      yamlStub.dump.restore();
    });

    it('should be a defined function', () =>
      assert.isFunction(configUtils.save));

    it('should add endpoint key', () => {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      assert.property(yamlStub.safeLoad(args[1]), 'endpoint');
    });

    it('should add blueprint key', () => {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      assert.property(yamlStub.safeLoad(args[1]), 'blueprint');
    });

    it('should remove aliases', () => {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      assert.notProperty(yamlStub.safeLoad(args[1]), 'p');
      assert.notProperty(yamlStub.safeLoad(args[1]), 'q');
    });

    it('should remove _', () => {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      assert.notProperty(yamlStub.safeLoad(args[1]), '_');
    });

    it('should remove $0', () => {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      assert.notProperty(yamlStub.safeLoad(args[1]), '_');
    });

    it('should save an object', () => {
      configUtils.save(argv);
      const call = fsStub.writeFileSync.getCall(0);
      const { args } = call;
      assert.notProperty(yamlStub.safeLoad(args[1]), '_');
    });

    it('should call YAML.dump', () => {
      configUtils.save(argv);
      assert.isOk(yamlStub.dump.called);
    });

    describe('when path is not given', () =>
      it('should save to ./dredd.yml', () => {
        configUtils.save(argv);
        const call = fsStub.writeFileSync.getCall(0);
        const { args } = call;
        assert.include(args[0], 'dredd.yml');
      }));

    describe('when path is given', () =>
      it('should save to that path', () => {
        const path = 'some-other-location.yml ';
        configUtils.save(argv, path);
        const call = fsStub.writeFileSync.getCall(0);
        const { args } = call;
        assert.include(args[0], path);
      }));
  });

  describe('load(path)', () => {
    const yamlData = `\
dry-run: true
hookfiles: null
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
loglevel: info
path: []
blueprint: blueprint
endpoint: endpoint\
`;

    beforeEach(() =>
      sinon.stub(fsStub, 'readFileSync').callsFake(() => yamlData),
    );

    afterEach(() => fsStub.readFileSync.restore());

    it('should be a defined function', () =>
      assert.isFunction(configUtils.load));

    describe('if no path is given', () =>
      it('should load from ./dredd.yml', () => {
        configUtils.load();
        const call = fsStub.readFileSync.getCall(0);
        const { args } = call;
        assert.include(args[0], 'dredd.yml');
      }));

    describe('when path is given', () =>
      it('should load from that path', () => {
        const path = 'some-other-location.yml ';
        configUtils.load(path);
        const call = fsStub.readFileSync.getCall(0);
        const { args } = call;
        assert.include(args[0], path);
      }));

    it('should move blueprint and enpoint to an array under _ key', () => {
      const output = configUtils.load();
      assert.isArray(output._);
      assert.equal(output._[0], 'blueprint');
      assert.equal(output._[1], 'endpoint');
    });

    it('should remove blueprint and endpoint keys', () => {
      const output = configUtils.load();
      assert.notProperty(output, 'blueprint');
      assert.notProperty(output, 'endpoint');
    });

    it('should return an object', () => {
      const output = configUtils.load();
      assert.isObject(output);
    });
  });

  describe('parseCustom(arrayOfCustoms)', () => {
    const custom = [
      'customOpt:itsValue:can:contain:delimiters',
      'customOpt2:itsValue',
    ];

    it('shold return an object', () => {
      assert.isObject(configUtils.parseCustom(custom));
    });

    it('should split values by first ":"', () => {
      const output = configUtils.parseCustom(custom);

      assert.property(output, 'customOpt');
      assert.property(output, 'customOpt2');
      assert.equal(output.customOpt, 'itsValue:can:contain:delimiters');
      assert.equal(output.customOpt2, 'itsValue');
    });
  });
});
