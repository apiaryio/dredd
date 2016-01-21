# Compile HTTP request-response pairs from API Blueprint AST

[![Build Status](https://travis-ci.org/apiaryio/blueprint-transactions.png?branch=master)](https://travis-ci.org/apiaryio/blueprint-transactions)
[![Dependency Status](https://david-dm.org/apiaryio/blueprint-transactions.png)](https://david-dm.org/apiaryio/blueprint-transactions)
[![devDependency Status](https://david-dm.org/apiaryio/blueprint-transactions/dev-status.png)](https://david-dm.org/apiaryio/blueprint-transactions#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/github/apiaryio/blueprint-transactions/badge.svg?branch=master)](https://coveralls.io/github/apiaryio/blueprint-transactions?branch=master)

[![NPM](https://nodei.co/npm/blueprint-transactions.png)](https://nodei.co/npm/blueprint-transactions/)

This library takes API Blueprint AST and returns specific HTTP transactions (Request and Response pair).

- Inherits parameters from parent Resource and Action sections
- Expands URI templates
- Warns on undefined URI query and path parameters
- Validates URI parameter types
- Selects first request and first response if multiple request or responses are given in the API Blueprint AST
- Assigns path origin object pointing to the API Blueprint AST
- Compiles [canonical transaction path](#canonical-transaction-paths) as a unique identifier for each transaction
- Assigns origin object pointing to the API Blueprint AST [DEPRECATED]
- Compiles Transaction name string for each transaction [DEPRECATED]


## Installation

```
npm install blueprint-transactions
```


## Usage

```
compiler = require('blueprint-transactions')

transactions = compiler.compile(ast, './apiary.apib')
```

`transactions` is now an Array of compiled [Transaction Objects](#compiled-transaction-object-structure)


### Compiled Transaction Object Structure

Following is description is in a [MSON](https://github.com/apiaryio/mson) format

- transaction (object)
    - name: `Hello world! > Retrieve Message` (string) - Transaction identification name used for referencing
    - path: `::Hello world!:Retreive Message:Example 1` (string) - [Canonical transaction path](#canonical-transaction-paths)

    - request (object) - Request compiled from blueprint
        - body: `Hello world!\n` (string)
        - headers (object)
        - uri: `/message` (string) - Informative URI of the request
        - method

    - response (object) - Expected response from blueprint
        - status: `200` (string)
        - headers (object)
        - body (string)
        - schema (string)

    - pathOrigin (object) - Reference to the original blueprint
        - apiName: `My Api` (string)
        - resourceGroupName: `Greetings` (string)
        - resourceName: `Hello, world!` (string)
        - actionName: `Retrieve Message` (string)
        - exampleName: `First example` (string)

    - origin (object) - [DEPRECATED, will be moved to Dredd reporter] Reference to the original blueprint for the human readable name
        - filename: `./blueprint.md` (string)
        - apiName: `My Api` (string)
        - resourceGroupName: `Greetings` (string)
        - resourceName: `Hello, world!` (string)
        - actionName: `Retrieve Message` (string)
        - exampleName: `First example` (string)


## Canonical transaction paths

Canonical transcation path is added to each compiled HTTP transaction as its identifier.

Format of the transaction path is  a concatenation/serialization of the `origin` object:

- Colon `:` character as a delimiter
- Examples are identified by string "Example " + its index in array starting from 1 (not 0)
- Colon character in API Name, Resource Name, Resource Group Name, Action Name or Example Name is escaped with backslash character `\`
- No other characters than colon `:` are escaped


# Examples


## 1. Full notation with multiple request-response pairs

```Markdown
# Some API Name

## Group Some Group Name

### Some Resource Name [/resource]

#### Some Action Name [GET]

+ Request (application/json)
+ Response 200 (application/json)

+ Request (application/xml)
+ Response 200 (application/xml)
```


**Transaction origin object:**

```JSON
{
  "apiName": "Some API Name",
  "resourceGroupName": "Some Group Name",
  "resourceName": "Some Resource Name",
  "actionName": "Some Action Name",
  "exampleName": "Example 2"
}
```


**Compiled canonical path:**

```
Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2
```


## 2. Full notation without group

```Markdown
# Some API Name

### Some Resource Name [/resource]

#### Some Action Name [GET]

+ Request (application/json)
+ Response 200 (application/json)
```

**Transaction origin object:**

```JSON
{
  "apiName": "Some API Name",
  "resourceGroupName": "",
  "resourceName": "Some Resource Name",
  "actionName": "Some Action Name",
  "exampleName": "Example 1"
}
```


**Compiled canonical path:**

```
Some API Name::Some Resource Name:Some Action Name:Example 1
```


## 3. Full notation without group and API name

```Markdown
### Some Resource Name [/resource]

#### Some Action Name [GET]

+ Request (application/json)
+ Response 200 (application/json)
```


**Transaction origin object:**

```JSON
{
  "apiName": "",
  "resourceGroupName": "",
  "resourceName": "Some Resource Name",
  "actionName": "Some Action Name",
  "exampleName": "Example 1"
}
```

**Compiled canonical path:**

```
::Some Resource Name:Some Action Name:Example 1
```


## 4. Full notation without group and API name with a colon

```Markdown
# My API: Revamp

### Some Resource Name [/resource]

#### Some Action Name [GET]

+ Request (application/json)
+ Response 200 (application/json)
```


**Transaction origin object:**

```JSON
{
  "apiName": "My API: Revamp",
  "resourceGroupName": "",
  "resourceName": "Some Resource Name",
  "actionName": "Some Action Name",
  "exampleName": "Example 1"
}
```

**Compiled canonical path:**

```
My API\: Revamp::Some Resource Name:Some Action Name:Example 1
```


## 5. Simplified notation

```Markdown
# GET /message
+ Response 200 (text/plain)

      Hello World
```


**Transaction origin object:**

```JSON
{
  "apiName": "",
  "resourceGroupName": "",
  "resourceName": "/message",
  "actionName": "GET",
  "exampleName": "Example 1"
}
```


**Compiled canonical path:**

```
::/message:GET:Example 1
```


## Contribution

Any contribution is more than welcome!

Fork, write tests, write clean, readable code which communicate, use `scripts/bdd`, keep the [test coverage][] and create a pull request.

[test coverage]: https://coveralls.io/r/apiaryio/blueprint-transactinos?branch=master
