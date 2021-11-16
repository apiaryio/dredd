#!/usr/bin/env node
// Cleans up after the prepack.js script

const fs = require('fs');
const path = require('path');
/* eslint-disable no-console */
/* eslint-disable-next-line import/no-extraneous-dependencies */
const rimraf = require('rimraf');

const PACKAGE_DIR = path.resolve(path.dirname(__filename), '..');
const SYMLINKS_LOG = path.join(PACKAGE_DIR, 'prepack-symlinks.log');

console.log('cleaning up symlinks...');

if (!fs.existsSync(SYMLINKS_LOG)) {
  console.log('no configuration present, nothing to clean.');
  process.exit(0);
}

console.log('found configuration at "%s"', SYMLINKS_LOG);

const dependencies = fs.readFileSync(SYMLINKS_LOG, 'utf8')
  .split('\n')
  .filter(line => line.trim());
console.log('found %d dependencies:\n', dependencies.length, dependencies);

const dependencyPaths = dependencies
  .map(dependencyName => path.join(PACKAGE_DIR, 'node_modules', dependencyName))
  .filter(symlinkPath => fs.existsSync(symlinkPath));
console.log('resolved dependency paths:', dependencyPaths);

dependencyPaths.forEach(symlinkPath => rimraf.sync(symlinkPath));
console.log('successfully unlinked %d symlinks!', dependencyPaths.length);

rimraf.sync(SYMLINKS_LOG);
console.log('successfully removed "%s"!', SYMLINKS_LOG);
