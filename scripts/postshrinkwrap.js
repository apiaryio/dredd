#!/usr/bin/env node
// Postprocesses the lockfile to remove dev dependencies and one C++
// dependency, and to enforce https://

const fs = require('fs');
const path = require('path');
const lockfile = require('../npm-shrinkwrap');

// Remove dev dependencies so they NEVER get to the final distribution
// of Dredd Transactions
Object.keys(lockfile.dependencies)
  .filter(name => lockfile.dependencies[name].dev)
  .forEach(name => delete lockfile.dependencies[name]);

// Force all installations of Dredd to use only the pure JavaScript version
// of the API Blueprint parser. It has slower performance, but it solves
// quite a few installation & distribution problems.
delete lockfile.dependencies['fury-adapter-apib-parser'].dependencies.drafter.requires.protagonist;
delete lockfile.dependencies.protagonist;

const json = JSON.stringify(lockfile, null, 2)
  // Sometimes the npm registry resolves to http:// URLs for no obvious reason.
  // There are multiple discussions and bugs about it at https://npm.community
  // and it seems to be the registry's infrastructure problem. Responsible
  // people suggested following as a safe workaround:
  .replace(/http:\/\//g, 'https://');

fs.writeFileSync(`${path.dirname(__filename)}/../npm-shrinkwrap.json`, json);
