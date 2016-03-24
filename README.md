# Dredd Transactions

[![Build Status](https://travis-ci.org/apiaryio/dredd-transactions.png?branch=master)](https://travis-ci.org/apiaryio/dredd-transactions)
[![Dependencies Status](https://david-dm.org/apiaryio/dredd-transactions.png)](https://david-dm.org/apiaryio/dredd-transactions)
[![devDependencies Status](https://david-dm.org/apiaryio/dredd-transactions/dev-status.png)](https://david-dm.org/apiaryio/dredd-transactions#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/github/apiaryio/dredd-transactions/badge.svg?branch=master)](https://coveralls.io/github/apiaryio/dredd-transactions?branch=master)

Dredd Transactions library compiles *HTTP Transactions* (simple Request-Response pairs) from API description document.

> **Note:** To better understand *emphasized* terms in this documentation, please refer to the [Glossary of Terms][api-blueprint-glossary]. All data structures are described using the [MSON][mson-spec] format.


## Work in Progress Notice

This project supersedes [Blueprint Transactions][blueprint-transactions] library. However, it is not ready yet nor used in [Dredd][dredd] and nobody is advised to consider this project as something to use in production environment as of now.


## Features

* Inherits parameters from parent *Resource* and *Action* sections.
* Expands *URI Templates*.
* Warns on undefined placeholders in *URI Templates* (both query and path).
* Validates URI parameter types.
* Selects first *Request* and first *Response* if multiple are specified in the API description document.


### Deprecated Features

* Compiles [Transaction Name][transaction-object-spec] string (vague identifier) for each *Transaction*.
* Provides [Transaction Origin][transaction-object-spec] with pointers to [API Elements][api-elements] derived from the original API description document.

> **Note:** These features are to be superseded by so-called _Transaction Path_. Feel free to read and comment the proposal in [apiaryio/dredd#227](https://github.com/apiaryio/dredd/issues/227).


## Installation

```
npm install dredd-transactions
```


## Development

Dredd Transactions library is written in [CoffeeScript](http://coffeescript.org/) language which compiles to JavaScript (ECMAScript 5).


## Usage

### `compile`

Compiles *HTTP Transactions* from given API description document.

```javascript
var dt = require('dredd-transactions');

dt.compile('# My API\n...', function (error, transactions) {
  // ...
});
```

### Arguments

- (string) - API Description Document provided as string.
- (function) - Callback.

### Callback Arguments

- (enum[null, object]) - JavaScript error object.
- (array[Transaction]) - Compiled [Transaction objects][transaction-object-spec].


## Data Structures

<a name="transaction-object"></a>
### Transaction (object)

Represents a single *HTTP Transaction* (Request-Response pair) and its location in the API description document. The location is provided in two forms, both **deprecated** as of now:

- `name` - String representation, both human- and machine-readable.
- `origin` - Object of references to nodes of [API Elements][api-elements] derived from the original API description document.

> **Note:** These two forms of locating HTTP Transactions are to be superseded by so-called _Transaction Path_. Feel free to read and comment the proposal in [apiaryio/dredd#227](https://github.com/apiaryio/dredd/issues/227).


### Properties

- request (object) - HTTP Request as described in API description document
    - method
    - uri: `/message` (string) - Informative URI of the Request
    - headers (object)
    - body: `Hello world!\n` (string)
- response (object) - Expected HTTP Response as described in API description document
    - status: `200` (string)
    - headers (object)
    - body (string)
    - schema (string)


### Deprecated Properties

- name: `Hello world! > Retrieve Message` (string) - Transaction Name, non-deterministic breadcrumb location of the HTTP Transaction within the API description document
- origin (object) - Object of references to nodes of [API Elements][api-elements] derived from the original API description document
    - filename: `./blueprint.md` (string)
    - apiName: `My Api` (string)
    - resourceGroupName: `Greetings` (string)
    - resourceName: `Hello, world!` (string)
    - actionName: `Retrieve Message` (string)
    - exampleName: `First example` (string)

> **Note:** These properties are to be superseded by so-called _Transaction Path_. Feel free to read and comment the proposal in [apiaryio/dredd#227](https://github.com/apiaryio/dredd/issues/227).


[dredd]: https://github.com/apiaryio/dredd
[mson-spec]: https://github.com/apiaryio/mson
[api-elements]: http://api-elements.readthedocs.org/
[api-blueprint-glossary]: https://github.com/apiaryio/api-blueprint/blob/master/Glossary%20of%20Terms.md
[blueprint-transactions]: https://github.com/apiaryio/blueprint-transactions/


[transaction-object-spec]: #transaction-object
