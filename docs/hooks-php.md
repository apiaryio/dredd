# Writing Dredd Hooks In PHP

[![Build Status](https://travis-ci.org/ddelnano/dredd-hooks-php.svg?branch=master)](https://travis-ci.org/ddelnano/dredd-hooks-php)

[GitHub repository](https://github.com/ddelnano/dredd-hooks-php)

PHP hooks are using [Dredd's hooks handler socket interface](hooks-new-language.md). For using PHP hooks in Dredd you have to have [Dredd already installed](quickstart.md)

## Installation

### Requirements
 - php version >= 5.4

Installing dredd-hooks-php can be easily installed through the package manager, composer.

```
$ composer require ddelnano/dredd-hooks-php --dev
```

## Usage

```
$ dredd apiary.apib http://localhost:3000 --language vendor/bin/dredd-hooks-php --hookfiles=./hooks*.php
```

## API Reference

The `Dredd\Hooks` class provides the static methods listed below to create hooks

1. `beforeEach`, `beforeEachValidation`, `afterEach`
  - accepts a closure as a first argument passing a [Transaction object](hooks.md#transaction-object-structure) as a first argument

2. `before`, `beforeValidation`, `after`
  - accepts [transaction name](hooks.md#getting-transaction-names) as a first argument
  - accepts a block as a second argument passing a [Transaction object](hooks.md#transaction-object-structure) as a first argument of it

3. `beforeAll`, `afterAll`
  - accepts a block as a first argument passing an Array of [Transaction objects](hooks.md#transaction-object-structure) as a first argument


Refer to [Dredd execution lifecycle](usage.md#dredd-execution-lifecycle) to find when is each hook function executed.

### Using PHP API

Example usage of all methods.
**Very Important** The `$transaction` variable passed to the closure **MUST** be a reference.
Otherwise the `$transaction` variable will be passed by value when the closure is executed
and the changes will not be reflected.

```php
<?php

use Dredd\Hooks;

Hooks::beforeAll(function(&$transaction) {

    echo "before all";
});

Hooks::beforeEach(function(&$transaction) {

    echo "before each";
});

Hooks::before("Machines > Machines collection > Get Machines", function(&$transaction) {

    echo "before";
});

Hooks::beforeEachValidation(function(&$transaction) {

    echo "before each validation";
});

Hooks::beforeValidation("Machines > Machines collection > Get Machines", function(&$transaction) {

    echo "before validation";
});


Hooks::after("Machines > Machines collection > Get Machines", function(&$transaction) {

    echo "after";
});

Hooks::afterEach(function(&$transaction) {

    echo "after each";
});

Hooks::afterAll(function(&$transaction) {

    echo "after all";
});

```

## Examples

In the [dredd-hooks-php repository](https://github.com/ddelnano/dredd-hooks-php/) there is an example laravel application with instructions in the [wiki](https://github.com/ddelnano/dredd-hooks-php/wiki/Laravel-Example)

### How to Skip Tests

Any test step can be skipped by setting `skip` property of the `transaction` object to `true`.

```php
<?php

use Dredd\Hooks;


Hooks::before("Machines > Machines collection > Get Machines", function(&$transaction) {

    $transaction->skip = true;
});
```

### Failing Tests Programmatically

You can fail any step by setting `fail` property on `transaction` object to `true` or any string with descriptive message.

```php
<?php

use Dredd\Hooks;


Hooks::before("Machines > Machines collection > Get Machines", function(&$transaction) {

    $transaction->fail = true;
});
```

### Modifying Transaction Request Body Prior to Execution

```php
<?php

use Dredd\Hooks;

Hooks::before("Machines > Machines collection > Get Machines", function(&$transaction) {

    $requestBody = $transaction->request->body;

    $requestBody['someKey'] = 'new value';

    $transaction->request->body = json_encode($requestBody);
});
```

### Adding or Changing URI Query Parameters to All Requests

```php
<?php

use Dredd\Hooks;


Hooks::beforeEach(function(&$transaction) {

    // add query parameter to each transaction here

    $paramToAdd = 'api-key=23456';

    if (strpos($transaction->fullPath, "?") {

        $transaction->fullPath .= "&{$paramToAdd}";
    }

    else {

        $transaction->fullPath .= "?{$paramToAdd}";
    }
});
```

### Handling sessions

```php
<?php

use Dredd\Hooks;

$stash = [];

Hooks::after("Auth > /remoteauto/userpass", function(&$transaction) use ($stash) {

    $parsedBody = json_decode($transaction->real->body);

    $stash['token'] = $parseBody->sessionId;
});

Hooks::beforeEach(function(&$transaction) use ($stash) {

    if ($transaction->token) {

        $transaction->request->headers->Cookie = "id={$stash['token']}s";
    }
});
```
