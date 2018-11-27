.. include:: _links.rst
.. _how-it-works:

How It Works
============

In a nutshell, Dredd does following:

1. Takes your API description document,
2. creates expectations based on requests and responses documented in the document,
3. makes requests to tested API,
4. checks whether API responses match the documented responses,
5. reports the results.

Versioning
----------

Dredd follows `Semantic Versioning <https://semver.org/>`__. To ensure certain stability of your Dredd installation (e.g. in CI), pin the version accordingly. You can also use release tags:

-  ``npm install dredd`` - Installs the latest published version including experimental pre-release versions.
-  ``npm install dredd@stable`` - Skips experimental pre-release versions. Recommended for CI installations.

If the ``User-Agent`` header isn’t overridden in the API description document, Dredd uses it for sending information about its version number along with every HTTP request it does.

.. _execution-life-cycle:

Execution Life Cycle
--------------------

Following execution life cycle documentation should help you to understand how Dredd works internally and which action goes after which.

1. Load and parse API description documents

   -  Report parse errors and warnings

2. Pre-run API description check

   -  Missing example values for URI template parameters
   -  Required parameters present in URI
   -  Report non-parseable JSON bodies
   -  Report invalid URI parameters
   -  Report invalid URI templates

3. Compile HTTP transactions from API description documents

   -  Inherit headers
   -  Inherit parameters
   -  Expand URI templates with parameters

4. Load :ref:`hooks <hooks>`
5. Test run

   -  Report test run ``start``
   -  Run ``beforeAll`` hooks
   -  For each compiled transaction:

      -  Report ``test start``
      -  Run ``beforeEach`` hook
      -  Run ``before`` hook
      -  Send HTTP request
      -  Receive HTTP response
      -  Run ``beforeEachValidation`` hook
      -  Run ``beforeValidation`` hook
      -  :ref:`Perform validation <automatic-expectations>`
      -  Run ``after`` hook
      -  Run ``afterEach`` hook
      -  Report ``test end`` with result for in-progress reporting

   -  Run ``afterAll`` hooks

6. Report test run ``end`` with result statistics

.. _automatic-expectations:

Automatic Expectations
----------------------

Dredd automatically generates expectations on HTTP responses based on examples in the API description with use of the `Gavel`_ library. Please refer to `Gavel's rules <https://relishapp.com/apiary/gavel/docs>`__ if you want know more.

Response Headers Expectations
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-  All headers specified in the API description must be present in the response.
-  Names of headers are validated in the case-insensitive way.
-  Only values of headers significant for content negotiation are validated.
-  All other headers values can differ.

When using `OpenAPI 2`_, headers are taken from ``response.headers`` (:openapi2:`responseheaders`). HTTP headers significant for content negotiation are inferred according to following rules:

-  ``produces`` (:openapi2:`swaggerproduces`) is propagated as response’s ``Content-Type`` header.
-  Response’s ``Content-Type`` header overrides any ``produces``.

Response Body Expectations
~~~~~~~~~~~~~~~~~~~~~~~~~~

If the HTTP response body is JSON, Dredd validates only its structure. Bodies in any other format are validated as plain text.

To validate the structure Dredd uses `JSON Schema`_ inferred from the API description under test. The effective JSON Schema is taken from following places (the order goes from the highest priority to the lowest):

API Blueprint
^^^^^^^^^^^^^

1. :apib:`Schema <def-schema-section>` section - provided custom JSON Schema (`Draft 4 <JSON Schema Draft 4_>`__ and `Draft 3 <JSON Schema Draft 3_>`__) will be used.
2. :apib:`Attributes <def-attributes-section>` section with data structure description in `MSON`_ - API Blueprint parser automatically generates JSON Schema from MSON.
3. :apib:`Body <def-body-section>` section with sample JSON payload - `Gavel`_, which is responsible for validation in Dredd, automatically infers some basic expectations described below.

This order :apib:`exactly follows the API Blueprint specification <relation-of-body-schema-and-attributes-sections>`.

OpenAPI 2
^^^^^^^^^

1. ``response.schema`` (:openapi2:`responseschema`) - provided JSON Schema will be used.
2. ``response.examples`` (:openapi2:`responseexamples`) with sample JSON payload - `Gavel`_, which is responsible for validation in Dredd, automatically infers some basic expectations described below.

.. _gavels-expectations:

Gavel’s Expectations
^^^^^^^^^^^^^^^^^^^^

-  All JSON keys on any level given in the sample must be present in the response’s JSON.
-  Response’s JSON values must be of the same JSON primitive type.
-  All JSON values can differ.
-  Arrays can have additional items, type or structure of the items is not validated.
-  Plain text must match perfectly.

Custom Expectations
~~~~~~~~~~~~~~~~~~~

You can make your own custom expectations in :ref:`hooks <hooks>`. For instance, check out how to employ :ref:`Chai.js assertions <using-chai-assertions>`.

Making Your API Description Ready for Testing
---------------------------------------------

It’s very likely that your API description document will not be testable **as is**. This section should help you to learn how to solve the most common issues.

URI Parameters
~~~~~~~~~~~~~~

Both `API Blueprint`_ and `OpenAPI 2`_ allow usage of URI templates (API Blueprint fully implements :rfc:`6570`, OpenAPI 2 templates are much simpler). In order to have an API description which is testable, you need to describe all required parameters used in URI (path or query) and provide sample values to make Dredd able to expand URI templates with given sample values. Following rules apply when Dredd interpolates variables in a templated URI, ordered by precedence:

1. Sample value, in OpenAPI 2 available as the ``x-example`` vendor extension property (:ref:`docs <example-values-for-request-parameters>`).
2. Value of ``default``.
3. First value from ``enum``.

If Dredd isn’t able to infer any value for a required parameter, it will terminate the test run and complain that the parameter is *ambiguous*.

.. note::
   The implementation of API Blueprint’s request-specific parameters is still in progress and there’s only experimental support for it in Dredd as of now.

Request Headers
~~~~~~~~~~~~~~~

In `OpenAPI 2`_ documents, HTTP headers are inferred from ``"in": "header"`` parameters (:openapi2:`parameterobject`). HTTP headers significant for content negotiation are inferred according to following rules:

-  ``consumes`` (:openapi2:`swaggerconsumes`) is propagated as request’s ``Content-Type`` header.
-  ``produces`` (:openapi2:`swaggerproduces`) is propagated as request’s ``Accept`` header.
-  If request body parameters are specified as ``"in": "formData"``, request’s ``Content-Type`` header is set to ``application/x-www-form-urlencoded``.


Request Body
~~~~~~~~~~~~

API Blueprint
^^^^^^^^^^^^^

The effective request body is taken from following places (the order goes from the highest priority to the lowest):

1. :apib:`Body <def-body-section>` section with sample JSON payload.
2. :apib:`Attributes <def-attributes-section>` section with data structure description in `MSON`_ - API Blueprint parser automatically generates sample JSON payload from MSON.

This order :apib:`exactly follows the API Blueprint specification <relation-of-body-schema-and-attributes-sections>`.

OpenAPI 2
^^^^^^^^^

The effective request body is inferred from ``"in": "body"`` and ``"in": "formData"`` parameters (:openapi2:`parameterobject`).

If body parameter has ``schema.example`` (:openapi2:`schemaexample`), it is used as a raw JSON sample for the request body. If it’s not present, Dredd’s `OpenAPI 2 adapter <https://github.com/apiaryio/fury-adapter-swagger/>`__ generates sample values from the JSON Schema provided in the ``schema`` (:openapi2:`parameterschema`) property. Following rules apply when the adapter fills values of the properties, ordered by precedence:

1. Value of ``default``.
2. First value from ``enum``.
3. Dummy, generated value.

.. _empty-response-body:

Empty Response Body
~~~~~~~~~~~~~~~~~~~

If there is no body example or schema specified for the response in your API description document, Dredd won’t imply any assertions. Any server response will be considered as valid.

If you want to enforce the incoming body is empty, you can use :ref:`hooks <hooks>`:

.. literalinclude:: ../test/fixtures/response/empty-body-hooks.js
   :language: javascript

In case of responses with 204 or 205 status codes Dredd still behaves the same way, but it warns about violating the :rfc:`7231` when the responses have non-empty bodies.

.. _choosing-http-transactions:

Choosing HTTP Transactions
--------------------------

API Blueprint
~~~~~~~~~~~~~

While `API Blueprint`_ allows specifying multiple requests and responses in any combination (see specification for the :apib:`action section <def-action-section>`), Dredd currently supports just separated HTTP transaction pairs like this:

::

   + Request
   + Response

   + Request
   + Response

In other words, Dredd always selects just the first response for each request.

.. note::
   Improving the support for multiple requests and responses is under development. Refer to issues :ghissue:`#25` and :ghissue:`#78` for details. Support for URI parameters specific to a single request within one action is also limited. Solving :ghissue:`#227` should unblock many related problems. Also see :ref:`multiple-requests-and-responses` guide for workarounds.

OpenAPI 2
~~~~~~~~~

The `OpenAPI 2`_ format allows to specify multiple responses for a single operation. By default Dredd tests only responses with ``2xx`` status codes. Responses with other codes are marked as *skipped* and can be activated in :ref:`hooks <hooks>` - see the :ref:`multiple-requests-and-responses` how-to guide.

In ``produces`` (:openapi2:`swaggerproduces`) and ``consumes`` (:openapi2:`swaggerconsumes`), only JSON media types are supported. Only the first JSON media type in ``produces`` is effective, others are skipped. Other media types are respected only when provided with :openapi2:`explicit examples <responseexamples>`.

:openapi2:`Default response <responsesdefault>` is ignored by Dredd unless it is the only available response. In that case, the default response is assumed to have HTTP 200 status code.

.. _security:

Security
--------

Depending on what you test and how, output of Dredd may contain sensitive data.

Mind that if you run Dredd in a CI server provided as a service (such as `CircleCI`_, `Travis CI`_, etc.), you are disclosing the CLI output of Dredd to third parties.

When using :ref:`Apiary Reporter and Apiary Tests <using-apiary-reporter-and-apiary-tests>`, you are sending your testing data to `Apiary`_ (Dredd creators and maintainers). See their `Terms of Service <https://apiary.io/tos>`__ and `Privacy Policy <https://apiary.io/privacy>`__. Which data exactly is being sent to Apiary?

-  **Complete API description under test.** This means your API Blueprint or OpenAPI 2 files. The API description is stored encrypted in Apiary.
-  **Complete testing results.** Those can contain details of all requests made to the server under test and their responses. Apiary stores this data unencrypted, even if the original communication between Dredd and the API server under test happens to be over HTTPS. See :ref:`Apiary Reporter Test Data <apiary-reporter-test-data>` for detailed description of what is sent. You can :ref:`sanitize it before it gets sent <removing-sensitive-data-from-test-reports>`.
-  **Little meta data about your environment.** Contents of environment variables ``TRAVIS``, ``CIRCLE``, ``CI``, ``DRONE``, ``BUILD_ID``, ``DREDD_AGENT``, ``USER``, and ``DREDD_HOSTNAME`` can be sent to Apiary. Your `hostname <https://en.wikipedia.org/wiki/Hostname>`__, version of your Dredd installation, and `type <https://nodejs.org/api/os.html#os_os_type>`__, `release <https://nodejs.org/api/os.html#os_os_release>`__ and `architecture <https://nodejs.org/api/os.html#os_os_arch>`__ of your OS can be sent as well. Apiary stores this data unencrypted.

See also :ref:`guidelines on how to develop Apiary Reporter <hacking-apiary-reporter>`.

.. _using-http-s-proxy:
.. _using-https-proxy:

Using HTTP(S) Proxy
-------------------

You can tell Dredd to use HTTP(S) proxy for:

-  downloading API description documents (the positional argument :option:`api-description-document` or the :option:`--path` option accepts also URL)
-  :ref:`reporting to Apiary <using-apiary-reporter-and-apiary-tests>`

Dredd respects ``HTTP_PROXY``, ``HTTPS_PROXY``, ``NO_PROXY``, ``http_proxy``, ``https_proxy``, and ``no_proxy`` environment variables. For more information on how those work see `relevant section <https://github.com/request/request#user-content-proxies>`__ of the underlying library’s documentation.

Dredd intentionally **does not support HTTP(S) proxies for testing**. Proxy can deliberately modify requests and responses or to behave in a very different way then the server under test. Testing over a proxy is, in the first place, testing of the proxy itself. That makes the test results irrelevant (and hard to debug).
