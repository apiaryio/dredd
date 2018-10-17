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

Dredd automatically generates expectations on HTTP responses based on examples in the API description with use of `Gavel.js <https://github.com/apiaryio/gavel.js>`__ library. Please refer to `Gavel <https://relishapp.com/apiary/gavel/docs>`__ rules if you want know more.

Response Headers Expectations
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-  All headers specified in the API description must be present in the response.
-  Names of headers are validated in the case-insensitive way.
-  Only values of headers significant for content negotiation are validated.
-  All other headers values can differ.

When using `Swagger <https://swagger.io/>`__, headers are taken from ``response.headers`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responseHeaders>`__). HTTP headers significant for content negotiation are inferred according to following rules:

-  ``produces`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-swaggerProduces>`__) is propagated as response’s ``Content-Type`` header.
-  Response’s ``Content-Type`` header overrides any ``produces``.

Response Body Expectations
~~~~~~~~~~~~~~~~~~~~~~~~~~

If the HTTP response body is JSON, Dredd validates only its structure. Bodies in any other format are validated as plain text.

To validate the structure Dredd uses `JSON Schema <http://json-schema.org/>`__ inferred from the API description under test. The effective JSON Schema is taken from following places (the order goes from the highest priority to the lowest):

API Blueprint
^^^^^^^^^^^^^

1. `Schema <https://apiblueprint.org/documentation/specification.html#def-schema-section>`__ section - provided custom JSON Schema (`Draft v4 <https://tools.ietf.org/html/draft-zyp-json-schema-04>`__ and `v3 <https://tools.ietf.org/html/draft-zyp-json-schema-03>`__) will be used.
2. `Attributes <https://apiblueprint.org/documentation/specification.html#def-attributes-section>`__ section with data structure description in `MSON <https://github.com/apiaryio/mson>`__ - API Blueprint parser automatically generates JSON Schema from MSON.
3. `Body <https://apiblueprint.org/documentation/specification.html#def-body-section>`__ section with sample JSON payload - `Gavel.js <https://github.com/apiaryio/gavel.js>`__, which is responsible for validation in Dredd, automatically infers some basic expectations described below.

This order `exactly follows the API Blueprint specification <https://apiblueprint.org/documentation/specification.html#relation-of-body-schema-and-attributes-sections>`__.

Swagger
^^^^^^^

1. ``response.schema`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responseSchema>`__) - provided JSON Schema will be used.
2. ``response.examples`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responseExamples>`__) with sample JSON payload - `Gavel.js <https://github.com/apiaryio/gavel.js>`__, which is responsible for validation in Dredd, automatically infers some basic expectations described below.

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

Both `API Blueprint <https://apiblueprint.org/>`__ and `Swagger <https://swagger.io/>`__ allow usage of URI templates (API Blueprint fully implements `RFC6570 <https://tools.ietf.org/html/rfc6570>`__, Swagger templates are much simpler). In order to have an API description which is testable, you need to describe all required parameters used in URI (path or query) and provide sample values to make Dredd able to expand URI templates with given sample values. Following rules apply when Dredd interpolates variables in a templated URI, ordered by precedence:

1. Sample value, in Swagger available as the ``x-example`` vendor extension property (:ref:`docs <example-values-for-request-parameters>`).
2. Value of ``default``.
3. First value from ``enum``.

If Dredd isn’t able to infer any value for a required parameter, it will terminate the test run and complain that the parameter is *ambiguous*.

.. note::
   The implementation of API Blueprint’s request-specific parameters is still in progress and there’s only experimental support for it in Dredd as of now.

Request Headers
~~~~~~~~~~~~~~~

In `Swagger <https://swagger.io/>`__ documents, HTTP headers are inferred from ``"in": "header"`` parameters (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-parameterObject>`__). HTTP headers significant for content negotiation are inferred according to following rules:

-  ``consumes`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-swaggerConsumes>`__) is propagated as request’s ``Content-Type`` header.
-  ``produces`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-swaggerProduces>`__) is propagated as request’s ``Accept`` header.
-  If request body parameters are specified as ``"in": "formData"``, request’s ``Content-Type`` header is set to ``application/x-www-form-urlencoded``.

.. note::
   Processing ``"in": "header"`` parameters and inferring ``application/x-www-form-urlencoded`` from ``"in": "formData"`` parameters is not implemented yet (`apiaryio/fury-adapter-swagger#68 <https://github.com/apiaryio/fury-adapter-swagger/issues/68>`__, `apiaryio/fury-adapter-swagger#67 <https://github.com/apiaryio/fury-adapter-swagger/issues/67>`__).

Request Body
~~~~~~~~~~~~

API Blueprint
^^^^^^^^^^^^^

The effective request body is taken from following places (the order goes from the highest priority to the lowest):

1. `Body <https://apiblueprint.org/documentation/specification.html#def-body-section>`__ section with sample JSON payload.
2. `Attributes <https://apiblueprint.org/documentation/specification.html#def-attributes-section>`__ section with data structure description in `MSON <https://github.com/apiaryio/mson>`__ - API Blueprint parser automatically generates sample JSON payload from MSON.

This order `exactly follows the API Blueprint specification <https://apiblueprint.org/documentation/specification.html#relation-of-body-schema-and-attributes-sections>`__.

Swagger
^^^^^^^

The effective request body is inferred from ``"in": "body"`` and ``"in": "formData"`` parameters (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-parameterObject>`__).

If body parameter has ``schema.example`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-schemaExample>`__), it is used as a raw JSON sample for the request body. If it’s not present, Dredd’s `Swagger Adapter <https://github.com/apiaryio/fury-adapter-swagger/>`__ generates sample values from the JSON Schema provided in the ``schema`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-parameterSchema>`__) property. Following rules apply when the adapter fills values of the properties, ordered by precedence:

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

In case of responses with 204 or 205 status codes Dredd still behaves the same way, but it warns about violating the `RFC7231 <https://tools.ietf.org/html/rfc7231>`__ when the responses have non-empty bodies.

.. _choosing-http-transactions:

Choosing HTTP Transactions
--------------------------

API Blueprint
~~~~~~~~~~~~~

While `API Blueprint <https://apiblueprint.org/>`__ allows specifying multiple requests and responses in any combination (see specification for the `action section <https://apiblueprint.org/documentation/specification.html#def-action-section>`__), Dredd currently supports just separated HTTP transaction pairs like this:

::

   + Request
   + Response

   + Request
   + Response

In other words, Dredd always selects just the first response for each request.

.. note::
   Improving the support for multiple requests and responses is under development. Refer to issues `#25 <https://github.com/apiaryio/dredd/issues/25>`__ and `#78 <https://github.com/apiaryio/dredd/issues/78>`__ for details. Support for URI parameters specific to a single request within one action is also limited. Solving `#227 <https://github.com/apiaryio/dredd/issues/227>`__ should unblock many related problems. Also see :ref:`multiple-requests-and-responses` guide for workarounds.

Swagger
~~~~~~~

The `Swagger <https://swagger.io/>`__ format allows to specify multiple responses for a single operation. By default Dredd tests only responses with ``2xx`` status codes. Responses with other codes are marked as *skipped* and can be activated in :ref:`hooks <hooks>` - see the :ref:`multiple-requests-and-responses` how-to guide.

In ``produces`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-swaggerProduces>`__) and ``consumes`` (`docs <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-swaggerConsumes>`__), only JSON media types are supported. Only the first JSON media type in ``produces`` is effective, others are skipped. Other media types are respected only when provided with `explicit examples <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responseExamples>`__.

`Default response <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responsesDefault>`__ is ignored by Dredd unless it is the only available response. In that case, the default response is assumed to have HTTP 200 status code.

.. _security:

Security
--------

Depending on what you test and how, output of Dredd may contain sensitive data.

Mind that if you run Dredd in a CI server provided as a service (such as `CircleCI <https://circleci.com/>`__, `Travis CI <https://travis-ci.org/>`__, etc.), you are disclosing the CLI output of Dredd to third parties.

When using :ref:`Apiary Reporter and Apiary Tests <using-apiary-reporter-and-apiary-tests>`, you are sending your testing data to `Apiary <https://apiary.io/>`__ (Dredd creators and maintainers). See their `Terms of Service <https://apiary.io/tos>`__ and `Privacy Policy <https://apiary.io/privacy>`__. Which data exactly is being sent to Apiary?

-  **Complete API description under test.** This means your API Blueprint or Swagger files. The API description is stored encrypted in Apiary.
-  **Complete testing results.** Those can contain details of all requests made to the server under test and their responses. Apiary stores this data unencrypted, even if the original communication between Dredd and the API server under test happens to be over HTTPS. See :ref:`Apiary Reporter Test Data <apiary-reporter-test-data>` for detailed description of what is sent. You can :ref:`sanitize it before it gets sent <removing-sensitive-data-from-test-reports>`.
-  **Little meta data about your environment.** Contents of environment variables ``TRAVIS``, ``CIRCLE``, ``CI``, ``DRONE``, ``BUILD_ID``, ``DREDD_AGENT``, ``USER``, and ``DREDD_HOSTNAME`` can be sent to Apiary. Your `hostname <https://en.wikipedia.org/wiki/Hostname>`__, version of your Dredd installation, and `type <https://nodejs.org/api/os.html#os_os_type>`__, `release <https://nodejs.org/api/os.html#os_os_release>`__ and `architecture <https://nodejs.org/api/os.html#os_os_arch>`__ of your OS can be sent as well. Apiary stores this data unencrypted.

See also :ref:`guidelines on how to develop Apiary Reporter <hacking-apiary-reporter>`.

.. _using-http-s-proxy:
.. _using-https-proxy:

Using HTTP(S) Proxy
-------------------

You can tell Dredd to use HTTP(S) proxy for:

-  downloading API description documents (:ref:`the positional argument <api-description-document-string>` or the ``--path`` option (docs :ref:`path-p`) accepts also URL)
-  :ref:`reporting to Apiary <using-apiary-reporter-and-apiary-tests>`

Dredd respects ``HTTP_PROXY``, ``HTTPS_PROXY``, ``NO_PROXY``, ``http_proxy``, ``https_proxy``, and ``no_proxy`` environment variables. For more information on how those work see `relevant section <https://github.com/request/request#user-content-proxies>`__ of the underlying library’s documentation.

Dredd intentionally **does not support HTTP(S) proxies for testing**. Proxy can deliberately modify requests and responses or to behave in a very different way then the server under test. Testing over a proxy is, in the first place, testing of the proxy itself. That makes the test results irrelevant (and hard to debug).
