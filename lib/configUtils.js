const clone = require('clone');
const fs = require('fs');
const yaml = require('js-yaml');


function save(argsOrigin, path) {
  if (!path) { path = './dredd.yml'; }

  const args = clone(argsOrigin);

  args.blueprint = args._[0];
  args.endpoint = args._[1];

  Object.keys(args).forEach((key) => {
    if (key.length === 1) { delete args[key]; }
  });

  delete args.$0;
  delete args._;

  fs.writeFileSync(path, yaml.dump(args));
}


function load(path) {
  if (!path) { path = './dredd.yml'; }

  const yamlData = fs.readFileSync(path);
  const data = yaml.safeLoad(yamlData);

  data._ = [data.blueprint, data.endpoint];

  delete data.blueprint;
  delete data.endpoint;

  return data;
}


function parseCustom(customArray) {
  const output = {};
  if (Array.isArray(customArray)) {
    for (const string of customArray) {
      const splitted = string.split(/:(.+)?/);
      output[splitted[0]] = splitted[1];
    }
  }
  return output;
}


module.exports = {
  save,
  load,
  parseCustom,
};
