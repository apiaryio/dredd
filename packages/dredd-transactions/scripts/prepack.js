#!/usr/bin/env node
// Alters the 'node_modules' to remove a C++ dependency of the API Blueprint
// parser before the 'npm pack' creates the package

const fs = require('fs');
const path = require('path');

const drafterPackageData = require('../../../node_modules/drafter/package');

delete drafterPackageData.dependencies.protagonist;
delete drafterPackageData.optionalDependencies.protagonist;
const json = JSON.stringify(drafterPackageData, null, 2);

// prettier-ignore
fs.writeFileSync(
  `${path.dirname(__filename)}/../../../node_modules/drafter/package.json`,
  json
);
