const { spawn } = require('child_process');
const { expect } = require('chai');
const { Given, When, Then } = require('cucumber');


Given('an API description with transactions "GET /articles" and "POST /articles"', function () {
  this.dredd.apiDescription = `test/fixtures/blog/apidesc${this.apiDescriptionExt}`;
});

Given('an implementation, which requires authorization on "POST /articles"', function () {
  this.dredd.args.push('--server=node test/fixtures/blog/app.js');
});

Given('I have hooks adding authorization to "POST /articles"', function () {
  this.dredd.args.push(`--hookfiles=test/fixtures/blog/hooks${this.hooksExt}`);
});

When('I run Dredd', { timeout: 10 * 1000 }, function (callback) {
  const args = [
    'bin/dredd',
    this.dredd.apiDescription,
    this.dredd.apiLocation,
    '--color=false',
  ].concat(this.dredd.args);

  const cli = spawn('node', args);
  cli.stdout.on('data', (data) => { this.dredd.output += data; });
  cli.stderr.on('data', (data) => { this.dredd.output += data; });
  cli.on('exit', (exitStatus) => { this.dredd.exitStatus = exitStatus; callback(); });
});

Then('the "GET /articles" test passes', function () {
  expect(this.dredd.output).to.contain('pass: GET (200) /articles');
});

Then('the "POST /articles" test passes', function () {
  expect(this.dredd.output).to.contain('pass: POST (201) /articles');
});

Then('the "POST /articles" test fails', function () {
  expect(this.dredd.output).to.contain('fail: POST (201) /articles');
});
