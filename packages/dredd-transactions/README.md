# Dredd Transactions

[![npm version](https://badge.fury.io/js/dredd-transactions.svg)](https://badge.fury.io/js/dredd-transactions)

Dredd Transactions library compiles _HTTP Transactions_ (simple Request-Response pairs) from API description document.

> **Note:** To better understand _emphasized_ terms in this documentation, please refer to the [Glossary of Terms][api-blueprint-glossary]. All data structures are described using the [MSON][mson-spec] format.

This project supersedes [Blueprint Transactions][blueprint-transactions] library.

## Features

- Inherits parameters from parent _Resource_ and _Action_ sections.
- Expands _URI Templates_.
- Warns on undefined placeholders in _URI Templates_ (both query and path).
- Validates URI parameter types.
- Selects first _Request_ and first _Response_ if multiple are specified in the API description document.

### Deprecated Features

- Compiles [Transaction Name][transaction-object-spec] string (vague identifier) for each _Transaction_.
- Provides [Transaction Origin][transaction-object-spec] with pointers to [API Elements][api-elements] derived from the original API description document.

> **Note:** These features are to be superseded by whatever comes out of the proposal in [apiaryio/dredd#227](https://github.com/apiaryio/dredd/issues/227).

## Installation

```
npm install dredd-transactions
```

## Development

Dredd Transactions library is written in JavaScript (ES2015+).

## Usage

### `parse`

Parses given API description document into API Elements with options specific
to Dredd. Assumes that documents with unrecognizable format are
[API Blueprint][api-blueprint]. Turns any parser failures, including
the unexpected ones, into [API Elements][api-elements] annotations.

```javascript
const parse = require('dredd-transactions/parse');
// const { parse } = require('dredd-transactions');

parse('# My API\n...', (error, parseResult) => {
  // ...
});
```

### `compile`

Compiles _HTTP Transactions_ from given [API Elements][api-elements]. _HTTP Transactions_ are a backbone data structure to Dredd.

```javascript
const compile = require('dredd-transactions/compile');
// const { compile } = require('dredd-transactions');

const compileResult = compile(mediaType, apiElements, filename);
```

> **Note:** The `filename` argument is optional and about to get deprecated, see [#6][filename-deprecation]

## Data Structures

<a name="parse-result-object"></a>

### Parse Result (object)

Result of parsing.

- `mediaType`: `text/vnd.apiblueprint` (string, default, nullable) - Media type of the input format, can be empty in case of some fatal errors
- `apiElements` ([API Elements][api-elements]) - API Elements parse result

<a name="compile-result-object"></a>

### Compile Result (object)

Result of compilation. Alongside compiled [Transaction][transaction-object-spec] objects contains also errors and warnings, mainly from API description parser.

- `mediaType`: `text/vnd.apiblueprint` (string, default, nullable) - Media type of the input format, defaults to API Blueprint format. Can be empty in case of some fatal errors.
- `transactions` (array[[Transaction][transaction-object-spec]]) - Compiled _HTTP Transactions_.
- `annotations` (array[[Annotation][annotation-object-spec]]) - Errors and warnings which occurred during parsing of the API description or during compilation of transactions.

<a name="transaction-object"></a>

### Transaction (object)

Represents a single _HTTP Transaction_ (Request-Response pair) and its location in the API description document. The location is provided in two forms, both **deprecated** as of now:

- `name` - String representation, both human- and machine-readable.
- `origin` - Object of references to nodes of [API Elements][api-elements] derived from the original API description document.

> **Note:** These two forms of locating HTTP Transactions are to be superseded by whatever comes out of the proposal in [apiaryio/dredd#227](https://github.com/apiaryio/dredd/issues/227).

### Properties

- request (object) - HTTP Request as described in API description document.
    - method
    - uri: `/message` (string) - Informative URI of the Request.
    - headers (array) - List of HTTP headers in their original order, with the original casing of the header name, including multiple headers of the same name.
        - (object)
            - name: `Content-Type` (string)
            - value: `text/plain` (string)
    - body: `Hello world!\n` (string)
- response (object) - Expected HTTP Response as described in API description document.
    - status: `200` (string)
    - headers (array) - List of HTTP headers in their original order, with the original casing of the header name, including multiple headers of the same name.
        - (object)
            - name: `Content-Type` (string)
            - value: `text/plain` (string)
    - body (string, optional)
    - schema (string, optional)

### Deprecated Properties

- name: `Hello world! > Retrieve Message` (string) - Transaction Name, non-deterministic breadcrumb location of the HTTP Transaction within the API description document.
- origin (object) - Object of references to nodes of [API Elements][api-elements] derived from the original API description document.
    - filename: `./api-description.apib` (string)
    - apiName: `My Api` (string)
    - resourceGroupName: `Greetings` (string)
    - resourceName: `Hello, world!` (string)
    - actionName: `Retrieve Message` (string)
    - exampleName: `First example` (string)

> **Note:** These properties are to be superseded by whatever comes out of the proposal in [apiaryio/dredd#227](https://github.com/apiaryio/dredd/issues/227).

<a name="annotation-object"></a>

### Annotation (object)

Description of an error or warning which occurred during parsing of the API description or during compilation of transactions.

#### Properties

- type (enum[string])
    - `error`
    - `warning`
- component (enum[string]) - In which component of the compilation process the annotation occurred
    - `apiDescriptionParser`
    - `parametersValidation`
    - `uriTemplateExpansion`
- message (string) - Textual annotation. This is – in most cases – a human-readable message to be displayed to user
- location (array, fixed, nullable) - Location of the annotation in the source file, represented by a single range of line and column number pairs if available, or by `null` otherwise
    - (array) - Start location
        - (number) - Line number
        - (number) - Column number
    - (array) - End location
        - (number) - Line number
        - (number) - Column number

### Deprecated Properties

- name: `Hello world! > Retrieve Message` (string) - Transaction Name, non-deterministic breadcrumb location of the relevant HTTP Transaction within the API description document.
- origin (object) - Object of references to nodes of [API Elements][api-elements] derived from the original API description document.
    - filename: `./api-description.apib` (string)
    - apiName: `My Api` (string)
    - resourceGroupName: `Greetings` (string)
    - resourceName: `Hello, world!` (string)
    - actionName: `Retrieve Message` (string)
    - exampleName: `First example` (string)

> **Note:** These properties are to be superseded by whatever comes out of the proposal in [apiaryio/dredd#227](https://github.com/apiaryio/dredd/issues/227).

[dredd]: https://dredd.org
[mson-spec]: https://github.com/apiaryio/mson
[api-elements]: http://api-elements.readthedocs.org/
[api-blueprint]: https://apiblueprint.org/
[api-blueprint-glossary]: https://github.com/apiaryio/api-blueprint/blob/master/Glossary%20of%20Terms.md
[blueprint-transactions]: https://github.com/apiaryio/blueprint-transactions/
[filename-deprecation]: https://github.com/apiaryio/dredd-transactions/issues/6
[compile-result-object-spec]: #compile-result-object
[transaction-object-spec]: #transaction-object
[annotation-object-spec]: #annotation-object
[source-map]: https://github.com/refractproject/refract-spec/blob/master/namespaces/parse-result-namespace.md#source-map-element
