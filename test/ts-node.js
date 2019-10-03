require('ts-node').register({
  // This path is relative to the CWD of "mocha" process,
  // which is, usually, the root directory of the repo.
  project: './test/tsconfig.json',
  transpileOnly: true,
});
