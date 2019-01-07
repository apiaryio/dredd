#!/usr/bin/env node
// Postprocesses the lockfile to enforce https://

const fs = require('fs');
const path = require('path');
const lockfile = require('../npm-shrinkwrap');

const json = JSON.stringify(lockfile, null, 2)
  // Sometimes the npm registry resolves to http:// URLs for no obvious reason.
  // There are multiple discussions and bugs about it at https://npm.community
  // and it seems to be the registry's infrastructure problem. Responsible
  // people suggested following as a safe workaround:
  .replace(/http:\/\//g, 'https://');

fs.writeFileSync(`${path.dirname(__filename)}/../npm-shrinkwrap.json`, json);
