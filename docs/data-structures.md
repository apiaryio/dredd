# Data Structures

Documentation of various data structures in both [Gavel.js][] and Dredd. [MSON notation](https://github.com/apiaryio/mson) is used to describe the data structures.

<a name="transaction"></a>
## Transaction (object)

Transaction object is passed as a first argument to [hook functions](hooks.md) and is one of the main public interfaces in Dredd.

- id: `GET (200) /greetings` - identifier for this transaction
- name: `./api-description.apib > My API > Greetings > Hello, world! > Retrieve Message > Example 2` (string) - reference to the transaction definition in the original API description document (see also [Dredd Transactions][])
- origin (object) - reference to the transaction definition in the original API description document (see also [Dredd Transactions][])
    - filename: `./api-description.apib` (string)
    - apiName: `My Api` (string)
    - resourceGroupName: `Greetings` (string)
    - resourceName: `Hello, world!` (string)
    - actionName: `Retrieve Message` (string)
    - exampleName: `Example 2` (string)
- host: `127.0.0.1` (string) - server hostname without port number
- port: `3000` (number) - server port number
- protocol: `https:` (enum[string]) - server protocol
    - `https:` (string)
    - `http:` (string)
- fullPath: `/message` (string) - expanded [URI Template][] with parameters (if any) used for the HTTP request Dredd performs to the tested server
- request (object) - the HTTP request Dredd performs to the tested server, taken from the API description
    - body: `Hello world!\n` (string)
    - bodyEncoding (enum) - can be manually set in [hooks](hooks.md)
        - `utf-8` (string) - indicates `body` contains a textual content encoded in UTF-8
        - `base64` (string) - indicates `body` contains a binary content encoded in Base64
    - headers (object) - keys are HTTP header names, values are HTTP header contents
    - uri: `/message` (string) - request URI as it was written in API description
    - method: `POST` (string)
- expected (object) - the HTTP response Dredd expects to get from the tested server
    - statusCode: `200` (string)
    - headers (object) - keys are HTTP header names, values are HTTP header contents
    - body (string)
    - bodySchema (object) - JSON Schema of the response body
- real (object) - the HTTP response Dredd gets from the tested server (present only in `after` hooks)
    - statusCode: `200` (string)
    - headers (object) - keys are HTTP header names, values are HTTP header contents
    - body (string)
    - bodyEncoding (enum)
        - `utf-8` (string) - indicates `body` contains a textual content encoded in UTF-8
        - `base64` (string) - indicates `body` contains a binary content encoded in Base64
- skip: `false` (boolean) - can be set to `true` and the transaction will be skipped
- fail: `false` (enum) - can be set to `true` or string and the transaction will fail
    - (string) - failure message with details why the transaction failed
    - (boolean)
- test ([Transaction Test][]) - test data passed to Dredd's reporters
- results ([Transaction Results][]) - testing results

<a name="transaction-test"></a>
## Transaction Test (object)

- start (Date) - start of the test
- end (Date) - end of the test
- duration (number) - duration of the test in milliseconds
- startedAt (number) - unix timestamp, [transaction][].startedAt
- title (string) - [transaction][].id
- request (object) - [transaction][].request
- actual (object) - [transaction][].real
- expected (object) - [transaction][].expected
- status (enum) - whether the validation passed or not, defaults to empty string
    - `pass` (string)
    - `fail` (string)
    - `skip` (string)
- message (string) - concatenation of all messages from all [Gavel Errors](#gavel-error) in `results` or Dredd's custom message (e.g. "failed in before hook")
- results (Dredd's [transaction][].results)
- valid (boolean)
- origin (object) - [transaction][].origin

<a name="transaction-results"></a>
## Transaction Results (object)

This is a cousin of the [Gavel Validation Result](#gavel-validation-result).

- general (object) - contains Dredd's custom messages (e.g. "test was skipped"), formatted the same way like those from Gavel
  - results (array[[Gavel Error][]])
- statusCode ([Gavel Validator Output][])
- headers ([Gavel Validator Output][])
- body ([Gavel Validator Output][])

<a name="gavel-validation-result"></a>
## Gavel Validation Result (object)

Can be seen also [here](https://relishapp.com/apiary/gavel/docs/javascript/request-async-api#validate).

- statusCode ([Gavel Validator Output][])
- headers ([Gavel Validator Output][])
- body ([Gavel Validator Output][])
- version (string) - version number of the Gavel Validation Result structure

<a name="gavel-validator-output"></a>
## Gavel Validator Output (object)

Can be seen also [here](https://relishapp.com/apiary/gavel/docs/data-validators-and-output-format#validators-output-format).

- results (array[[Gavel Error][]])
- realType (string) - media type
- expectedType (string) - media type
- validator (string) - validator class name
- rawData (enum) - raw output of the validator, has different structure for every validator and is saved and used in Apiary to render graphical diff by [gavel2html](https://github.com/apiaryio/gavel2html/)
    - ([JsonSchema Validation Result][])
    - ([TextDiff Validation Result][])

<a name="jsonschema-validation-result"></a>
## JsonSchema Validation Result (object)

The validation error is based on format provided by [Amanda][] and is also "documented" [here](https://github.com/apiaryio/Amanda/blob/master/docs/json/objects/error.md). Although for validation of draft4 JSON Schema Gavel uses [tv4][] library, the output then gets reshaped into the structure of Amanda's errors.

This validation result is returned not only when validating against [JSON Schema][], but also when validating against JSON example or when validating HTTP headers.

- length: `0` (number, default) - number of error properties
- errorMessages (object) - doesn't seem to ever contain anything or be used for anything
- *0* (object) - validation error details, property is always a string containing a number (0, 1, 2, ...)
    - property (array[string]) - path to the problematic property in format of [json-pointer's `parse()` output](https://github.com/manuelstofer/json-pointer#user-content-parsestr)
    - propertyValue (mixed) - real value of the problematic property (can be also `undefined` etc.)
    - attributeName: `enum`, `required` (string) - name of the relevant JSON Schema attribute, which triggered the error
    - attributeValue (mixed) - value of the relevant JSON Schema attribute, which triggered the error
    - message (string) - error message (in case of tv4 it contains [JSON Pointer][] to the problematic property and for both Amanda and tv4 it can directly mention property names and/or values)
    - validator: `enum` (string) - the same as `attributeName`
    - validatorName: `error`, `enum` (string) - the same as `attributeName`
    - validatorValue (mixed) - the same as `attributeValue`

<a name="textdiff-validation-result"></a>
## TextDiff Validation Result (string)

Block of text which looks extremely similar to the standard GNU diff/patch format. Result of the [`patch_toText()` function of the `google-diff-match-patch` library](https://github.com/google/diff-match-patch/wiki/API#user-content-patch_totextpatches--text).

<a name="gavel-error"></a>
## Gavel Error (object)

Can also be seen as part of Gavel Validator Output [here](https://relishapp.com/apiary/gavel/docs/data-validators-and-output-format#validators-output-format).

- pointer (string) - [JSON Pointer][] path
- severity (string) - severity of the error
- message (string) - error message

<a name="apiary-reporter-test-data"></a>
## Apiary Reporter Test Data (object)

- testRunId (string) - ID of the [test run](#apiary-test-run), recieved from Apiary
- origin (object) - [test][].origin
- duration (number) - duration of the test in milliseconds
- result (string) - [test][].status
- startedAt (number) - [test][].startedAt
- resultData (object)
    - request (object) - [test][].request
    - realResponse (object) - [test][].actual
    - expectedResponse (object) - [test][].expected
    - result ([Transaction Results][]) - [test][].results

## Internal Apiary Data Structures

These are private data structures used in Apiary internally and they are documented incompletely. They're present in this document just to provide better insight on what and how Apiary internally saves. It is closely related to what you can see in documentation for [Apiary Tests API for anonymous test reports][] and [Apiary Tests API for authenticated test reports][].

<a name="apiary-test-run"></a>
### Apiary Test Run (object)

Also known as `stats` in Dredd's code.

- result
    - tests: `0` (number, default) - total number of tests
    - failures: `0` (number, default)
    - errors: `0` (number, default)
    - passes: `0` (number, default)
    - skipped: `0` (number, default)
    - start: `0` (number, default)
    - end: `0` (number, default)
    - duration: `0` (number, default)

<a name="apiary-test-step"></a>
### Apiary Test Step (object)

- resultData
    - request (object) - [test][].request
    - realResponse (object) - [test][].actual
    - expectedResponse (object) - [test][].expected
    - result ([Transaction Results][]) - [test][].results


[Transaction]: #transaction
[Transaction Test]: #transaction-test
[Transaction Results]: #transaction-results
[Gavel Validation Result]: #gavel-validation-result
[Gavel Validator Output]: #gavel-validator-output
[JsonSchema Validation Result]: #jsonschema-validation-result
[TextDiff Validation Result]: #textdiff-validation-result
[Gavel Error]: #gavel-error
[Apiary Reporter Test Data]: #apiary-reporter-test-data
[Apiary Test Run]: #apiary-test-run-result
[Apiary Test Step]: #apiary-test-step-resultdata

[transaction]: #transaction
[test]: #transaction-test

[Amanda]: https://github.com/apiaryio/Amanda
[tv4]: https://github.com/geraintluff/tv4
[Gavel.js]: https://github.com/apiaryio/gavel.js
[URI Template]: https://tools.ietf.org/html/rfc6570
[JSON Pointer]: https://tools.ietf.org/html/rfc6901
[JSON Schema]: http://json-schema.org/

[Apiary Tests API for anonymous test reports]: https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApiAnonymous.apib
[Apiary Tests API for authenticated test reports]: https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApi.apib
[Dredd Transactions]: https://github.com/apiaryio/dredd-transactions#user-content-data-structures
