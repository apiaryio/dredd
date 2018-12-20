#!/usr/bin/env node
// Postprocesses the lockfile to remove C++ dependency and to enforce https://

const fs = require('fs');
const path = require('path');
const lockfile = require('../npm-shrinkwrap');

// Force all installations of Dredd to use only the pure JavaScript version
// of the API Blueprint parser. It has slower performance, but it solves
// quite a few installation & distribution problems.
delete lockfile.dependencies.drafter.requires.protagonist;
delete lockfile.dependencies.protagonist;

const json = JSON.stringify(lockfile, null, 2)
  // Sometimes the npm registry resolves to http:// URLs for no obvious reason.
  // There are multiple discussions and bugs about it at https://npm.community
  // and it seems to be the registry's infrastructure problem. Responsible
  // people suggested following as a safe workaround:
  .replace(/http:\/\//g, 'https://');

fs.writeFileSync(`${path.dirname(__filename)}/../npm-shrinkwrap.json`, json);
