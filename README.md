# Compile HTTP request-response pairs from API Blueprint AST

[![Build Status](https://travis-ci.org/apiaryio/blueprint-transactions.png?branch=master)](https://travis-ci.org/apiaryio/blueprint-transactions)
[![Dependency Status](https://david-dm.org/apiaryio/blueprint-transactions.png)](https://david-dm.org/apiaryio/blueprint-transactions)
[![devDependency Status](https://david-dm.org/apiaryio/blueprint-transactions/dev-status.png)](https://david-dm.org/apiaryio/blueprint-transactions#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/blueprint-transactions/badge.png?branch=master)](https://coveralls.io/r/apiaryio/blueprint-transactions?branch=master)

[![NPM](https://nodei.co/npm/blueprint-transactions.png)](https://nodei.co/npm/blueprint-transactions/)

This library takes API Blueprint AST and returns specific HTTP transactions (Request and Response pair).

- Inherits parameters from parent Resource and Action sections
- Expands URI templates
- Warns on undefined URI query and path parameters
- Validates URI parameteres types
- Assigns origin object pointing to the Blueprint AST
- Compiles Transaction name string for each transaction

## Installation

```
npm install blueprint-transactions
```

## Usage

```
compiler = require('blueprint-transactions')

transactions = compiler.compile(ast, './apiay.apib')
```

## Contribution

Any contribution is more than welcome!

Fork, write tests, write clean, readable code which communicate, use `scripts/bdd`, keep the [test coverage][] and create a pull request.

[test coverage]: https://coveralls.io/r/apiaryio/blueprint-transactinos?branch=master
