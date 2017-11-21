
const {assert} = require('chai');

const dreddTransactions = require('../../src/index');


describe("compiled transaction paths", function() {
  describe("Full notation with multiple request-response pairs", () =>

    it('should have expected path', function(done) {
      const code = `\
# Some API Name

## Group Some Group Name

### Some Resource Name [/resource]

#### Some Action Name [GET]

+ Request (application/json)
+ Response 200 (application/json)

+ Request (application/xml)
+ Response 200 (application/xml)\
`;

      const expected = "Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2";

      const paths = [];
      return dreddTransactions.compile(code, null, function(err, compilationResult) {
        if (err) { return done(err); }

        for (let transaction of compilationResult.transactions) {
          paths.push(transaction.path);
        }
        assert.include(paths, expected);
        return done();
      });
    })
  );



  describe("Full notation without group", () =>
    it('should have expected path', function(done) {
      const code = `\
# Some API Name

### Some Resource Name [/resource]

#### Some Action Name [GET]

+ Request (application/json)
+ Response 200 (application/json)\
`;

      const expected = "Some API Name::Some Resource Name:Some Action Name:Example 1";

      const paths = [];
      return dreddTransactions.compile(code, null, function(err, compilationResult) {
        if (err) { return done(err); }
        for (let transaction of compilationResult.transactions) {
          paths.push(transaction.path);
        }
        assert.include(paths, expected);
        return done();
      });
    })
  );

  describe("Full notation without group and API name", () =>
    it('should have expected path', function(done) {
      const code = `\
### Some Resource Name [/resource]

#### Some Action Name [GET]

+ Request (application/json)
+ Response 200 (application/json)\
`;

      const expected = "::Some Resource Name:Some Action Name:Example 1";

      const paths = [];
      return dreddTransactions.compile(code, null, function(err, compilationResult) {
        if (err) { return done(err); }
        for (let transaction of compilationResult.transactions) {
          paths.push(transaction.path);
        }
        assert.include(paths, expected);
        return done();
      });
    })
  );

  describe("Full notation without group and API name with a colon", () =>
    it('should have expected path', function(done) {
      const code = `\
# My API: Revamp

### Some Resource Name [/resource]

#### Some Action Name [GET]

+ Request (application/json)
+ Response 200 (application/json)\
`;

      const expected = "My API\\: Revamp::Some Resource Name:Some Action Name:Example 1";

      const paths = [];
      return dreddTransactions.compile(code, null, function(err, compilationResult) {
        if (err) { return done(err); }
        for (let transaction of compilationResult.transactions) {
          paths.push(transaction.path);
        }
        assert.include(paths, expected);
        return done();
      });
    })
  );


  return describe("simplified notation", () =>
    it('should have expected path', function(done) {
      const code = `\
# GET /message
+ Response 200 (text/plain)

      Hello World\
`;

      const expected = "::/message:GET:Example 1";

      const paths = [];
      return dreddTransactions.compile(code, null, function(err, compilationResult) {
        if (err) { return done(err); }
        for (let transaction of compilationResult.transactions) {
          paths.push(transaction.path);
        }
        assert.include(paths, expected);
        return done();
      });
    })
  );
});
