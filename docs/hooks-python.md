# Writing Dredd Hooks In Python

Ruby hooks are using [Dredd's hooks handler socket interface](hooks-new-language.md). For using ruby hooks in Dredd you have to have [Dredd already installed](quickstart.md)

## Installation

```
$ pip install dredd_hooks
```

## Usage

```
$ dredd apiary.apib http://localhost:3000 --language python --hookfiles=./hooks*.rb
```

## API Reference

Module `dredd_hooks` imports following decorators:

1. `@before_each`, `before_each_validation`, `after_each`
  - wraps a function and passes [Transaction object](hooks.md#transaction-object-structure) as a first argument to its

2. `before`, `before_validation`, `after`
  - accepts [transacion name](hooks.md#getting-transaction-names) as a first argument
  - wraps a function and sends a [Transaction object](hooks.md#transaction-object-structure) as a first argument to it

3. `before_all`, `after_all`
  - wraps a function and passes an Array of [Transaction objects](hooks.md#transaction-object-structure)as a first argument to it


Refer to [Dredd execution lifecycle](usage.md#dredd-execution-lifecycle) to find when is each hook function executed.

### Using Python API

Example usage of all methods in

```python
import dredd_hooks as dredd

@hooks.before_all
def my_before_all_hook(transactions):
  print 'before all'

@hooks.before_each
def my_before_all_hook(transactions):
  print 'before each'

@hooks.before
def my_before_hook(transaction):
  print 'before'

@hooks.before_each_validation
def my_before_validation_hook(transaction):
  print 'before each validation'

@hooks.before_validation
def my_before_validation_hook(transaction):
  print 'before validations'

@hooks.after
def my_after_hook(transaction):
  print 'after'

@hooks.after_each
def after_each(transaction):
  print 'after_each'

@hooks.after_all
def my_after_all_hook(transaction):
  print 'after_all'

```

## Exapmles

### How to Skip Tests

Any test step can can be skipped by setting `skip` property of the `transaction` object to `true`.

```python
import dredd_hooks as hooks

@hooks.before("Machines > Machines collection > Get Machines")
def ship_test(transaction):
  transaction['skip'] = true
```

### Sharing Data Between Steps in Request Stash

If you want to test some API workflow, you may pass data between test steps using the response stash.

```ruby
import json as json
import dredd_hooks as hooks

response_stash = {}

@hooks.after("Machines > Machines collection > Create Machine")
def save_response_to_stash(transaction):
  # saving HTTP response to the stash
  response_stash[transaction['name']] = transaction['real']

@hooks.before("Machines > Machine > Delete a machine")
def add_machine_id_to_request(transaction):
  #reusing data from previouse response here
  parsed_body = json.load request_stash['Machines > Machines collection > Create Machine']
  machine_id = parsed_body['id']

  #replacing id in url with stashed id from previous response
  transaction['fullPath'].gsub! '42', machine_id
```

### Failing Tests Programmatically

You can fail any step by setting `fail` property on `transaction` object to `true` or any string with descriptive message.

```python
import dredd_hooks as hooks

@hooks.before("Machines > Machines collection > Get Machines")
def fail_transaction(transaction):
  transaction['fail'] = "Some failing message"
```

### Modifying Transaction Request Body Prior to Execution

```python
import json as json
import dredd_hooks as hooks

@hoos.before("Machines > Machines collection > Get Machines")
def add_value_to_body(transaction):
  # parse request body from blueprint
  request_body = JSON.parse transaction['request']['body']

  # modify request body here
  request_body['someKey'] = 'some new value'

  # stringify the new body to request
  transaction['request']['body'] = json.dumps(request_body)
```

### Adding or Changing URI Query Parameters to All Requests

```python
import dredd_hooks as hooks

@hooks.before_each
def add_api_key(transaction):
  # add query parameter to each transaction here
  param_to_add = "api-key=23456"

  if '?' in transaction['fullPath']:
    transaction['fullPath'] += "&" + param_to_add
  else:
    transaction['fullPath'] += "?" + param_to_add
```

### Handling sessions

```python
import json as json
import dredd_hooks as hooks

stash = {}

# hook to retrieve session on a login
@hooks.after('Auth > /remoteauth/userpass > POST')
def stash_session_id(transaction):
  parsed_body = JSON.load transaction['real']['body']
  stash['token'] = parsed_body['sessionId']

# hook to set the session cookie in all following requests
@hooks.before_each
def add_session_cookie(transaction):
  if 'token' not in stash:
    transaction['request']['headers']['Cookie'] = "id=" + stash['token']
```


### Remove traling newline character for in expected plain text bodies

```python
import re as re
import dredd_hooks as hooks

@hooks.before_each
def remove_trailing_newline(transaction):
  if transaction['expected']['headers']['Content-Type'] == 'text/plain':
    transaction['expected']['body'] = re.sub(/^\s+|\s+$/g, "", transaction['expected']['body'])
```