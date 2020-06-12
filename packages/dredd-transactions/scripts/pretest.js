/* eslint-disable no-console */

const path = require('path');
const fs = require('fs');

const fury = require('@apielements/core');

const parse = require('../parse');


const FIXTURES_DIR = path.join(__dirname, '..', 'test', 'fixtures');


function listFixtures(fixturesSubDir) {
  return fs.readdirSync(fixturesSubDir)
    .map(itemName => path.join(fixturesSubDir, itemName))
    .filter(itemPath => itemPath.endsWith('.apib') || itemPath.endsWith('.yml'));
}

function getJSONPath(fixturePath) {
  const dir = path.dirname(fixturePath);
  const basename = path.basename(fixturePath, path.extname(fixturePath));
  return `${path.join(dir, basename)}.json`;
}

function parseFixture(fixturePath) {
  return new Promise((resolve, reject) => {
    const fixture = fs.readFileSync(fixturePath, 'utf8');
    parse(fixture, (err, result) => {
      if (err) reject(err);
      else resolve(result.apiElements);
    });
  }).then((apiElements) => {
    const jsonPath = getJSONPath(fixturePath);
    const json = JSON.stringify(fury.minim.toRefract(apiElements), null, 2);
    fs.writeFileSync(jsonPath, json);
  });
}


const fixturesPerSubDir = fs.readdirSync(FIXTURES_DIR)
  .map(itemName => path.join(FIXTURES_DIR, itemName))
  .filter(itemPath => fs.statSync(itemPath).isDirectory())
  .map(listFixtures);
const fixtures = [].concat(...fixturesPerSubDir);

console.log(`Parsing ${fixtures.length} fixtures...`);
Promise
  .all(fixtures.map(parseFixture))
  .then(() => { console.log('Fixtures ready!'); })
  .catch((err) => { console.error(err); process.exitCode = 1; });
