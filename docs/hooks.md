# Hook Scripts

Similar to any other testing framework, Dredd supports executing code around each test step.
Hooks are code blocks executed in defined stage of [execution lifecycle](usage.md#dredd-execution-lifecycle).
In the hooks code you have an access to compiled HTTP [transaction object](#transaction-object-structure) which you can modify.

Hooks are usually used for:

- loading db fixtures
- cleanup after test step or steps
- handling authentication and sessions
- passing data between transactions (saving state from responses to _stash_)
- modifying request generated from blueprint
- changing generated expectations
- setting custom expectations
- debugging via logging stuff

# Languages

You can interact with your server implementation in following languages:

- [Ruby](hooks-ruby.md)
- [Python](hooks-python.md)
- [Node.js](hooks-nodejs.md)
- [PHP](hooks-php.md)
- [Go](hooks-go.md)
- [Perl](hooks-perl.md)
- [Sandboxed JavaScript](hooks-js-sandbox.md)

Dredd doesn't speak your language? [**It's very easy to write support for your language.**](hooks-new-language.md) Your contribution is more than welcome!


## Using Hook Files

To use a hook file with Dredd, use the `--hookfiles` flag in the command line.
You can use this flag multiple times or use a [glob](http://npmjs.com/package/glob) expression for loading multiple hook files.

Example:

```sh
$ dredd single_get.md http://machines.apiary.io --hookfiles=*_hooks.*
```

## Getting Transaction Names

For addressing specific test steps is used the __transaction names__ of the compiled HTTP transactions (_actions_) from the API Blueprint.

In order to retrieve transaction names please run Dredd with the `--names` argument last and it will print all available names of transactions.

For example, given an API Blueprint file `blueprint.md` as following:

```markdown
FORMAT: 1A

# Machines API

# Group Machines

# Machines collection [/machines]

## Get Machines [GET]

- Response 200 (application/json; charset=utf-8)

    [{"type": "bulldozer", "name": "willy"}]

```

Run this command to retrieve all transaction names:

```sh
$ dredd single_get.md http://machines.apiary.io --names
info: Machines > Machines collection > Get Machines
```

The `Machines > Machines collection > Get Machines` is the name of a transaction which you can use in your hooks.
See [Hooks JavaScript API Reference](#hooks-javascript-api-reference) for broader information of how is it used.

## Types of Hooks

Dredd supports following types of hooks:

- `beforeAll` called at the beginning of the whole test run
- `beforeEach` called before each HTTP transaction
- `before` called before some specific HTTP transaction
- `beforeEachValidation` called before each HTTP transaction is validated
- `beforeValidation` called before some specific HTTP transaction is validated
- `after` called after some specific HTTP transaction regardless its result
- `afterEach` called after each HTTP transaction
- `afterAll` called after whole test run

Refer to [Dredd execution lifecycle](usage.md#dredd-execution-lifecycle) when is each hook executed.

### Transaction Object Structure

Transaction object is used as a first argument for hook functions.
Following is description is in a [MSON](https://github.com/apiaryio/mson) format

- transaction (object)
    - name: `"Hello, world! > Retrieve Message"` (string) Transaction identification name used for referencing
    - host: `"localhost"` (string) hostname without port
    - port: `3000` (number)
    - protocol: `"https:"` (string)
    - fullPath: `"/message"` (string) expanded URI-Template with parameters (if any) used for the real HTTP(s) request

    - request (object) Request compiled from blueprint
        - body `"Hello world!\n"` (string)
        - headers (object)
        - uri `"/message"` (string) informative uri about the request
        - method

    - expected (object) Expected response from blueprint
        - statusCode `"200"` (string)
        - headers (object)
        - body (string)
        - schema (string)

    - real (object) System under test response data. Present only in `after` hook.
        - statusCode `"200"` (string)
        - headers (object)
        - body (string)

    - origin (object)  Reference to the original blueprint
        - filename `"./blueprint.md"` (string)
        - apiName `"My Api"` (string)
        - resourceGroupName `"Greetings"` (string)
        - resourceName `"Hello, world!"` (string)
        - actionName `"Retrieve Message"` (string)
        - exampleName `"First example"` (string)

    - skip `false` (boolean) Set to `true` to skip this transaction
    - fail `false` (boolean/string) Set to `true` or string with message and transaction will result in fail

    - test (object) Result of [Gavel][] validation, same object is passed to reporters
        - status `"fail"` (string) Test status - phase
        - start `"2015-03-19T00:58:32.796Z"` (string) Start time in [UTC ISO 8601][]
        - valid `false` (boolean) Test result

    - results (object) Results from [Gavel][] in it's format
        - version `"2"` (string) Gavel Validation version
        - statusCode (object) Validation results for status code
        - headers (object) Validation results for headers
        - body (object) Validation results for body

[UTC ISO 8601]: http://wikipedia.org/wiki/ISO_8601
[Gavel]: https://www.relishapp.com/apiary/gavel/docs
