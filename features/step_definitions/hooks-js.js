const { Given, When, Then } = require('cucumber');
const sinon = require('sinon');
const { expect } = require('chai');

const Dredd = require('../../lib/Dredd');


Given('I have an API description with transactions "GET /articles" and "POST /articles"', function () {
  this.config.path = `test/fixtures/blog/apidesc${this.apiDescriptionExt}`;
});

Given('I have an implementation, which requires auth on "POST /articles"', function () {
  this.config.options.server = 'node test/fixtures/blog/app.js';
});

Given('I have hooks adding auth to "POST /articles"', function () {
  this.config.hookfiles = `test/fixtures/blog/hooks${this.hooksExt}`;
});

When('I run Dredd', { timeout: 10 * 1000 }, function (callback) {
  this.dredd = new Dredd(this.config);
  this.dredd.run((error, stats) => {
    this.error = error;
    this.stats = stats;
    callback();
  });
});

Then('the "GET /articles" test passes', function () {
  // expect(this.config.emitter).to.contain('pass: GET (200) /articles');
  console.log(this.config.emitter.emit.getCalls());
  expect(this.config.emitter.emit.calledWithExactly('test pass', sinon.match())).to.be.true;
});

Then('the "POST /articles" test passes', function () {
  // expect(this.config.emitter).to.contain('pass: POST (201) /articles');
  expect(this.config.emitter.emit.calledWithExactly('test pass', 'foo')).to.be.true;
});

Then('the "POST /articles" test fails', function () {
  // expect(this.config.emitter).to.contain('fail: POST (201) /articles');
  expect(this.config.emitter.emit.calledWithExactly('test pass', 'foo')).to.be.true;
});
