const fs = require('fs');
const yaml = require('js-yaml');
const clone = require('clone');

const configUtils = {};

configUtils.save = function(argsOrigin, path) {
  if (path == null) { path = './dredd.yml'; }

  const args = clone(argsOrigin);

  args['blueprint'] = args['_'][0];
  args['endpoint'] = args['_'][1];

  for (let key in args) {
    const value = args[key];
    if (key.length === 1) { delete args[key]; }
  }

  delete args['$0'];
  delete args['_'];

  const yamlArgs = yaml.dump(args);
  return fs.writeFileSync(path, yamlArgs);
};


configUtils.load = function(path) {
  if (path == null) { path = './dredd.yml'; }

  const yamlData = fs.readFileSync(path);
  const data = yaml.safeLoad(yamlData);

  data['_'] = [data['blueprint'], data['endpoint']];

  delete data['blueprint'];
  delete data['endpoint'];

  return data;
};

configUtils.parseCustom = function(customArray) {
  const output = {};
  if (Array.isArray(customArray)) {
    for (let string of customArray) {
      const splitted = string.split(/:(.+)?/);
      output[splitted[0]] = splitted[1];
    }
  }

  return output;
};

module.exports = configUtils;
