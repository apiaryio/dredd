#!/usr/bin/env node
// Cleans up after the prepack.js script

const fs = require('fs');
const path = require('path');

const PACKAGE_DIR = path.resolve(path.dirname(__filename), '..');
const SYMLINKS_LOG = path.join(PACKAGE_DIR, 'prepack-symlinks.log');


if (fs.existsSync(SYMLINKS_LOG)) {
  fs.readFileSync(SYMLINKS_LOG, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(dependencyName => path.join(PACKAGE_DIR, 'node_modules', dependencyName))
    .filter(symlinkPath => fs.existsSync(symlinkPath))
    .forEach(symlinkPath => fs.unlinkSync(symlinkPath));

  fs.unlinkSync(SYMLINKS_LOG);
}
