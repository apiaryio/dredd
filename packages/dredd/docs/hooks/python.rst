.. _hooks-python:

Writing Dredd Hooks In Python
=============================

|Build Status|

`GitHub repository <https://github.com/apiaryio/dredd-hooks-python>`__

Python hooks are using :ref:`Dredd’s hooks handler socket interface <hooks-new-language>`. For using Python hooks in Dredd you have to have :ref:`Dredd already installed <quickstart>`

Installation
------------

::

   $ pip install dredd_hooks

Usage
-----

::

   $ dredd apiary.apib http://127.0.0.1:3000 --language=python --hookfiles=./hooks*.py

.. note::
   If you're running :ref:`Dredd inside Docker <docker>`, read about :ref:`specifics of getting it working together with non-JavaScript hooks <hooks-docker>`.

API Reference
-------------

Module ``dredd_hooks`` imports following decorators:

1. ``before_each``, ``before_each_validation``, ``after_each``

   -  wraps a function and passes :ref:`Transaction object <transaction>` as a first argument to it

2. ``before``, ``before_validation``, ``after``

   -  accepts :ref:`transaction name <getting-transaction-names>` as a first argument
   -  wraps a function and sends a :ref:`Transaction object <transaction>` as a first argument to it

3. ``before_all``, ``after_all``

   -  wraps a function and passes an Array of :ref:`Transaction objects <transaction>` as a first argument to it

Refer to :ref:`Dredd execution life-cycle <execution-life-cycle>` to find when is each hook function executed.

Using Python API
~~~~~~~~~~~~~~~~

Example usage of all methods in

.. code-block:: python

   import dredd_hooks as hooks

   @hooks.before_all
   def my_before_all_hook(transactions):
     print('before all')

   @hooks.before_each
   def my_before_each_hook(transaction):
     print('before each')

   @hooks.before
   def my_before_hook(transaction):
     print('before')

   @hooks.before_each_validation
   def my_before_each_validation_hook(transaction):
     print('before each validation')

   @hooks.before_validation
   def my_before_validation_hook(transaction):
     print('before validations')

   @hooks.after
   def my_after_hook(transaction):
     print('after')

   @hooks.after_each
   def my_after_each(transaction):
     print('after_each')

   @hooks.after_all
   def my_after_all_hook(transactions):
     print('after_all')

Examples
--------

More complex examples are to be found in the Github repository `under the examples directory <https://github.com/apiaryio/dredd-hooks-python/tree/master/examples>`__. If you want to share your own, don’t hesitate and sumbit a PR.

How to Skip Tests
~~~~~~~~~~~~~~~~~

Any test step can be skipped by setting ``skip`` property of the ``transaction`` object to ``true``.

.. code-block:: python

   import dredd_hooks as hooks

   @hooks.before("Machines > Machines collection > Get Machines")
   def skip_test(transaction):
     transaction['skip'] = True

Sharing Data Between Steps in Request Stash
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you want to test some API workflow, you may pass data between test steps using the response stash.

.. code-block:: python

   import json
   import dredd_hooks as hooks

   response_stash = {}

   @hooks.after("Machines > Machines collection > Create Machine")
   def save_response_to_stash(transaction):
     # saving HTTP response to the stash
     response_stash[transaction['name']] = transaction['real']

   @hooks.before("Machines > Machine > Delete a machine")
   def add_machine_id_to_request(transaction):
     #reusing data from previous response here
     parsed_body = json.loads(response_stash['Machines > Machines collection > Create Machine'])
     machine_id = parsed_body['id']
     #replacing id in URL with stashed id from previous response
     transaction['fullPath'] = transaction['fullPath'].replace('42', machine_id)

Failing Tests Programmatically
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can fail any step by setting ``fail`` property on ``transaction`` object to ``true`` or any string with descriptive message.

.. code-block:: python

   import dredd_hooks as hooks

   @hooks.before("Machines > Machines collection > Get Machines")
   def fail_transaction(transaction):
     transaction['fail'] = "Some failing message"

Modifying Transaction Request Body Prior to Execution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

   import json
   import dredd_hooks as hooks

   @hooks.before("Machines > Machines collection > Get Machines")
   def add_value_to_body(transaction):
     # parse request body from API description
     request_body = json.loads(transaction['request']['body'])

     # modify request body here
     request_body['someKey'] = 'some new value'

     # stringify the new body to request
     transaction['request']['body'] = json.dumps(request_body)

Adding or Changing URI Query Parameters to All Requests
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

   import dredd_hooks as hooks

   @hooks.before_each
   def add_api_key(transaction):
     # add query parameter to each transaction here
     param_to_add = "api-key=23456"

     if '?' in transaction['fullPath']:
       transaction['fullPath'] = ''.join((transaction['fullPath'], "&", param_to_add))
     else:
       transaction['fullPath'] = ''.join((transaction['fullPath'], "?", param_to_add))

Handling sessions
~~~~~~~~~~~~~~~~~

.. code-block:: python

   import json
   import dredd_hooks as hooks

   stash = {}

   # hook to retrieve session on a login
   @hooks.after('Auth > /remoteauth/userpass > POST')
   def stash_session_id(transaction):
     parsed_body = json.loads(transaction['real']['body'])
     stash['token'] = parsed_body['sessionId']

   # hook to set the session cookie in all following requests
   @hooks.before_each
   def add_session_cookie(transaction):
     if 'token' in stash:
       transaction['request']['headers']['Cookie'] = "id=" + stash['token']

Remove trailing newline character in expected *plain text* bodies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

   import dredd_hooks as hooks

   @hooks.before_each
   def remove_trailing_newline(transaction):
     if transaction['expected']['headers']['Content-Type'] == 'text/plain':
       transaction['expected']['body'] = transaction['expected']['body'].rstrip()

.. |Build Status| image:: https://travis-ci.org/apiaryio/dredd-hooks-python.svg?branch=master
   :target: https://travis-ci.org/apiaryio/dredd-hooks-python
