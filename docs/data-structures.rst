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
-  errors (:ref:`test-run-error`) - Transaction run errors (not validation errors)
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
--------------------------------

Transaction result equals to the validation result of the Gavel validation result. You can read more about the `Gavel validation structure <https://github.com/apiaryio/gavel.js>`__.

-  valid (boolean) - Indicates whether a transaction is valid.
-  fields (object)

   - [fieldName: string]: :ref:`gavel-validator-output`

.. _gavel-validator-output:

Gavel Validator Output (object)
-------------------------------

Can be seen also `here <https://relishapp.com/apiary/gavel/docs/data-validators-and-output-format#validators-output-format>`__.

-  valid (boolean) - Indicates an HTTP message field as valid
-  kind (enum: "json" | "text" | null)
-  values (object)

   -  expected (any) - Expected value of an HTTP message field
   -  actual (any) - Actual value of an HTTP message field

- errors (:ref:`gavel-error`)

.. _gavel-error:

Gavel Error (object)
--------------------

Can also be seen as part of Gavel Validator Output `here <https://relishapp.com/apiary/gavel/docs/data-validators-and-output-format#validators-output-format>`__.

-  message (string) - Error message
-  location (object) - (Optional) kind-dependent extra error information

   -  pointer (string) - :rfc:`JSON Pointer <6901>` path
   -  property (string[]) - A deep property path

.. _test-run-error:

Test run error (object)
-----------------------

Whenever an exception occurs during a test run it's being recorded under the ``errors`` property of the test.

Test run error has the following structure:

-  message (string) - Error message.

.. _apiary-reporter-test-data:

Apiary Reporter Test Data (object)
----------------------------------

-  testRunId (string) - ID of the :ref:`test run <apiary-test-run>`, recieved from Apiary
-  origin (object) - :ref:`test <transaction-test>`.origin
-  duration (number) - duration of the test in milliseconds
-  result (string) - :ref:`test <transaction-test>`.status
-  startedAt (number) - :ref:`test <transaction-test>`.startedAt
-  results (object)

   -  request (object) - :ref:`test <transaction-test>`.request
   -  realResponse (object) - :ref:`test <transaction-test>`.actual
   -  expectedResponse (object) - :ref:`test <transaction-test>`.expected
   -  errors (:ref:`test-run-error`) - Test run errors (not validation errors)
   -  validationResult (:ref:`transaction-results`) - :ref:`test <transaction-test>`.results

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

-  results

   -  request (object) - :ref:`test <transaction-test>`.request
   -  realResponse (object) - :ref:`test <transaction-test>`.actual
   -  expectedResponse (object) - :ref:`test <transaction-test>`.expected
   -  errors (:ref:`test-run-error`) - Test run errors (not validation errors)
   -  validationResult (:ref:`transaction-results`) - :ref:`test <transaction-test>`.results
