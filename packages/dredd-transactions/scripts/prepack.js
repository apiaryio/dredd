#!/usr/bin/env node
// Alters the 'node_modules' to remove a C++ dependency of the API Blueprint
// parser before the 'npm pack' creates the package

const fs = require('fs');
const path = require('path');
/* eslint-disable import/no-extraneous-dependencies */
const rimraf = require('rimraf');

const PACKAGE_DIR = path.resolve(__dirname, '..');
const SYMLINKS_LOG = path.join(PACKAGE_DIR, 'prepack-symlinks.log');
const APIB_PARSER_PATH = path.join(PACKAGE_DIR, 'node_modules', '@apielements', 'apib-parser');


function readPackageJson(packageDir) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json')));
}

function writePackageJson(packageDir, packageData) {
  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify(packageData, null, 2));
}

/**
 * Goes through the whole dependency tree of a given top-level dependency
 * and makes sure all packages involved are accessible in the local
 * 'node_modules' directory at least in form of symlinks.
 *
 * This is useful if the project uses yarn workspaces, but wants to publish
 * the package with npm and uses 'bundledDependencies'. 'npm pack' is not able
 * to find packages if they're put into the root 'node_modules' by yarn and
 * wouldn't be able to bundle them.
 *
 * @param {string} dependencyName Dependency tree root
 */
function symlinkDependencyTreeToLocalNodeModules(dependencyName) {
  const localDependencyPath = path.join(PACKAGE_DIR, 'node_modules', dependencyName);

  if (!fs.existsSync(localDependencyPath)) {
    const localDependencyPathDir = path.dirname(localDependencyPath);
    if (!fs.existsSync(localDependencyPathDir)) {
      fs.mkdirSync(localDependencyPathDir);
    }

    const source = path.relative(localDependencyPathDir, path.resolve(`../../node_modules/${dependencyName}`));
    fs.symlinkSync(source, localDependencyPath);
    fs.appendFileSync(SYMLINKS_LOG, `${dependencyName}\n`);
  }

  const packageData = readPackageJson(localDependencyPath);
  const dependencies = Object.keys(packageData.dependencies || {});
  dependencies.forEach(symlinkDependencyTreeToLocalNodeModules);
}


// make sure all bundled deps are accessible in the local 'node_modules' dir
const packageData = readPackageJson(PACKAGE_DIR);
const { bundledDependencies } = packageData;
bundledDependencies.forEach(symlinkDependencyTreeToLocalNodeModules);

// alter @apielements/apib-parser's package.json so it doesn't depend on protagonist
const apibParserPackageData = readPackageJson(APIB_PARSER_PATH);
delete apibParserPackageData.dependencies.protagonist;
delete apibParserPackageData.optionalDependencies.protagonist;
writePackageJson(APIB_PARSER_PATH, apibParserPackageData);

// get rid of protagonist everywhere
[
  path.join(PACKAGE_DIR, 'node_modules', 'protagonist'),
  path.join(PACKAGE_DIR, '..', '..', 'node_modules', 'protagonist'),
]
  .filter(protagonistPath => fs.existsSync(protagonistPath))
  .forEach(protagonistPath => rimraf.sync(protagonistPath));
