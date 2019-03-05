.. include:: _links.rst
.. _data-structures:

Data Structures
===============

Documentation of various data structures in both `Gavel`_ and Dredd. `MSON notation <mson>`__ is used to describe the data structures.

.. _transaction:

Transaction (object)
--------------------

Transaction object is passed as a first argument to :ref:`hook functions <hooks>` and is one of the main public interfaces in Dredd.

-  id: ``GET (200) /greetings`` - identifier for this transaction
-  name: ``./api-description.apib > My API > Greetings > Hello, world! > Retrieve Message > Example 2`` (string) - reference to the transaction definition in the original API description document (see also `Dredd Transactions <https://github.com/apiaryio/dredd-transactions#user-content-data-structures>`__)
-  origin (object) - reference to the transaction definition in the original API description document (see also `Dredd Transactions <https://github.com/apiaryio/dredd-transactions#user-content-data-structures>`__)

   -  filename: ``./api-description.apib`` (string)
   -  apiName: ``My Api`` (string)
   -  resourceGroupName: ``Greetings`` (string)
   -  resourceName: ``Hello, world!`` (string)
   -  actionName: ``Retrieve Message`` (string)
   -  exampleName: ``Example 2`` (string)

-  host: ``127.0.0.1`` (string) - server hostname without port number
-  port: ``3000`` (number) - server port number
-  protocol: ``https:`` (enum[string]) - server protocol

   -  ``https:`` (string)
   -  ``http:`` (string)

-  fullPath: ``/message`` (string) - expanded :rfc:`URI Template <6570>` with parameters (if any) used for the HTTP request Dredd performs to the tested server
-  request (object) - the HTTP request Dredd performs to the tested server, taken from the API description

   -  body: ``Hello world!\n`` (string)
   -  bodyEncoding (enum) - can be manually set in :ref:`hooks <hooks>`

      -  ``utf-8`` (string) - indicates ``body`` contains a textual content encoded in UTF-8
      -  ``base64`` (string) - indicates ``body`` contains a binary content encoded in Base64

   -  headers (object) - keys are HTTP header names, values are HTTP header contents
   -  uri: ``/message`` (string) - request URI as it was written in API description
   -  method: ``POST`` (string)

-  expected (object) - the HTTP response Dredd expects to get from the tested server

   -  statusCode: ``200`` (string)
   -  headers (object) - keys are HTTP header names, values are HTTP header contents
   -  body (string)
   -  bodySchema (object) - JSON Schema of the response body

-  real (object) - the HTTP response Dredd gets from the tested server (present only in ``after`` hooks)

   -  statusCode: ``200`` (string)
   -  headers (object) - keys are HTTP header names, values are HTTP header contents
   -  body (string)
   -  bodyEncoding (enum)

      -  ``utf-8`` (string) - indicates ``body`` contains a textual content encoded in UTF-8
      -  ``base64`` (string) - indicates ``body`` contains a binary content encoded in Base64

-  skip: ``false`` (boolean) - can be set to ``true`` and the transaction will be skipped
-  fail: ``false`` (enum) - can be set to ``true`` or string and the transaction will fail

   -  (string) - failure message with details why the transaction failed
   -  (boolean)

-  test (:ref:`transaction-test`) - test data passed to Dredd’s reporters
-  results (:ref:`transaction-results`) - testing results

.. _transaction-test:

Transaction Test (object)
-------------------------

-  start (Date) - start of the test
-  end (Date) - end of the test
-  duration (number) - duration of the test in milliseconds
-  startedAt (number) - unix timestamp, :ref:`transaction <transaction>`.startedAt
-  title (string) - :ref:`transaction <transaction>`.id
-  request (object) - :ref:`transaction <transaction>`.request
-  actual (object) - :ref:`transaction <transaction>`.real
-  expected (object) - :ref:`transaction <transaction>`.expected
-  status (enum) - whether the validation passed or not, defaults to empty string

   -  ``pass`` (string)
   -  ``fail`` (string)
   -  ``skip`` (string)

-  message (string) - concatenation of all messages from all :ref:`gavel-error` in ``results`` or Dredd’s custom message (e.g. “failed in before hook”)
-  results (Dredd’s :ref:`transaction <transaction>`.results)
-  valid (boolean)
-  origin (object) - :ref:`transaction <transaction>`.origin

.. _transaction-results:

Transaction Results (object)
----------------------------

This is a cousin of the :ref:`gavel-validation-result`.

-  general (object) - contains Dredd’s custom messages (e.g. “test was skipped”), formatted the same way like those from Gavel

   -  results (array[:ref:`gavel-error`])

-  statusCode (:ref:`gavel-validator-output`)
-  headers (:ref:`gavel-validator-output`)
-  body (:ref:`gavel-validator-output`)

.. _gavel-validation-result:

Gavel Validation Result (object)
--------------------------------

Can be seen also `here <https://relishapp.com/apiary/gavel/docs/javascript/request-async-api#validate>`__.

-  statusCode (:ref:`gavel-validator-output`)
-  headers (:ref:`gavel-validator-output`)
-  body (:ref:`gavel-validator-output`)
-  version (string) - version number of the Gavel Validation Result structure

.. _gavel-validator-output:

Gavel Validator Output (object)
-------------------------------

Can be seen also `here <https://relishapp.com/apiary/gavel/docs/data-validators-and-output-format#validators-output-format>`__.

-  results (array[:ref:`gavel-error`])
-  realType (string) - media type
-  expectedType (string) - media type
-  validator (string) - validator class name
-  rawData (enum) - raw output of the validator, has different structure for every validator and is saved and used in Apiary to render graphical diff by `gavel2html <https://github.com/apiaryio/gavel2html>`__

   -  (:ref:`jsonschema-validation-result`)
   -  (:ref:`textdiff-validation-result`)

.. _jsonschema-validation-result:

JsonSchema Validation Result (object)
-------------------------------------

The validation error is based on format provided by `Amanda <https://github.com/apiaryio/Amanda>`__ and is also “documented” `here <https://github.com/apiaryio/Amanda/blob/master/docs/json/objects/error.md>`__. Although for validation of draft4 JSON Schema Gavel uses `tv4 <https://github.com/geraintluff/tv4>`__ library, the output then gets reshaped into the structure of Amanda’s errors.

This validation result is returned not only when validating against `JSON Schema`_, but also when validating against JSON example or when validating HTTP headers.

-  length: ``0`` (number, default) - number of error properties
-  errorMessages (object) - doesn’t seem to ever contain anything or be used for anything
-  *0* (object) - validation error details, property is always a string containing a number (0, 1, 2, …)

   -  property (array[string]) - path to the problematic property in format of `json-pointer’s parse() output <https://github.com/manuelstofer/json-pointer#user-content-parsestr>`__
   -  propertyValue (mixed) - real value of the problematic property (can be also ``undefined`` etc.)
   -  attributeName: ``enum``, ``required`` (string) - name of the relevant JSON Schema attribute, which triggered the error
   -  attributeValue (mixed) - value of the relevant JSON Schema attribute, which triggered the error
   -  message (string) - error message (in case of tv4 it contains :rfc:`JSON Pointer <6901>` to the problematic property and for both Amanda and tv4 it can directly mention property names and/or values)
   -  validator: ``enum`` (string) - the same as ``attributeName``
   -  validatorName: ``error``, ``enum`` (string) - the same as ``attributeName``
   -  validatorValue (mixed) - the same as ``attributeValue``

.. _textdiff-validation-result:

TextDiff Validation Result (string)
-----------------------------------

Block of text which looks extremely similar to the standard GNU diff/patch format. Result of the ``patch_toText()`` function of the ``google-diff-match-patch`` library (`docs <https://github.com/google/diff-match-patch/wiki/API#user-content-patch_totextpatches--text>`__).

.. _gavel-error:

Gavel Error (object)
--------------------

Can also be seen as part of Gavel Validator Output `here <https://relishapp.com/apiary/gavel/docs/data-validators-and-output-format#validators-output-format>`__.

-  pointer (string) - :rfc:`JSON Pointer <6901>` path
-  severity (string) - severity of the error
-  message (string) - error message

.. _apiary-reporter-test-data:

Apiary Reporter Test Data (object)
----------------------------------

-  testRunId (string) - ID of the :ref:`test run <apiary-test-run>`, recieved from Apiary
-  origin (object) - :ref:`test <transaction-test>`.origin
-  duration (number) - duration of the test in milliseconds
-  result (string) - :ref:`test <transaction-test>`.status
-  startedAt (number) - :ref:`test <transaction-test>`.startedAt
-  resultData (object)

   -  request (object) - :ref:`test <transaction-test>`.request
   -  realResponse (object) - :ref:`test <transaction-test>`.actual
   -  expectedResponse (object) - :ref:`test <transaction-test>`.expected
   -  result (:ref:`transaction-results`) - :ref:`test <transaction-test>`.results

Internal Apiary Data Structures
-------------------------------

These are private data structures used in Apiary internally and they are documented incompletely. They’re present in this document just to provide better insight on what and how Apiary internally saves. It is closely related to what you can see in documentation for `Apiary Tests API for anonymous test reports <https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApiAnonymous.apib>`__ and `Apiary Tests API for authenticated test reports <https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApi.apib>`__.

.. _apiary-test-run:

Apiary Test Run (object)
~~~~~~~~~~~~~~~~~~~~~~~~

Also known as ``stats`` in Dredd’s code.

-  result

   -  tests: ``0`` (number, default) - total number of tests
   -  failures: ``0`` (number, default)
   -  errors: ``0`` (number, default)
   -  passes: ``0`` (number, default)
   -  skipped: ``0`` (number, default)
   -  start: ``0`` (number, default)
   -  end: ``0`` (number, default)
   -  duration: ``0`` (number, default)

.. _apiary-test-step:

Apiary Test Step (object)
~~~~~~~~~~~~~~~~~~~~~~~~~

-  resultData

   -  request (object) - :ref:`test <transaction-test>`.request
   -  realResponse (object) - :ref:`test <transaction-test>`.actual
   -  expectedResponse (object) - :ref:`test <transaction-test>`.expected
   -  result (:ref:`transaction-results`) - :ref:`test <transaction-test>`.results
