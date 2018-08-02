# How It Works

In a nutshell, Dredd does following:

1. Takes your API description document,
2. creates expectations based on requests and responses documented in the document,
3. makes requests to tested API,
4. checks whether API responses match the documented responses,
5. reports the results.

## Versioning

Dredd follows [Semantic Versioning][]. To ensure certain stability of your Dredd installation (e.g. in CI), pin the version accordingly. You can also use release tags:

- `npm install dredd` - Installs the latest published version including experimental pre-release versions.
- `npm install dredd@stable` - Skips experimental pre-release versions. Recommended for CI installations.

If the `User-Agent` header isn't overridden in the API description document, Dredd uses it for sending information about its version number along with every HTTP request it does.

## Execution Life Cycle

Following execution life cycle documentation should help you to understand how Dredd works internally and which action goes after which.

1. Load and parse API description documents
    - Report parse errors and warnings
2. Pre-run API description check
    - Missing example values for URI template parameters
    - Required parameters present in URI
    - Report non-parseable JSON bodies
    - Report invalid URI parameters
    - Report invalid URI templates
3. Compile HTTP transactions from API description documents
    - Inherit headers
    - Inherit parameters
    - Expand URI templates with parameters
4. Load [hooks](hooks.md)
5. Test run
    - Report test run `start`
    - Run `beforeAll` hooks
    - For each compiled transaction:
        - Report `test start`
        - Run `beforeEach` hook
        - Run `before` hook
        - Send HTTP request
        - Receive HTTP response
        - Run `beforeEachValidation` hook
        - Run `beforeValidation` hook
        - [Perform validation](#automatic-expectations)
        - Run `after` hook
        - Run `afterEach` hook
        - Report `test end` with result for in-progress reporting
    - Run `afterAll` hooks
6. Report test run `end` with result statistics

## Automatic Expectations

Dredd automatically generates expectations on HTTP responses based on examples in the API description with use of [Gavel.js][] library. Please refer to [Gavel][] rules if you want know more.

### Response Headers Expectations

- All headers specified in the API description must be present in the response.
- Names of headers are validated in the case-insensitive way.
- Only values of headers significant for content negotiation are validated.
- All other headers values can differ.

When using [Swagger][], headers are taken from [`response.headers`][response-headers]. HTTP headers significant for content negotiation are inferred according to following rules:

- [`produces`][produces] is propagated as response's `Content-Type` header.
- Response's `Content-Type` header overrides any `produces`.

### Response Body Expectations

If the HTTP response body is JSON, Dredd validates only its structure. Bodies in any other format are validated as plain text.

To validate the structure Dredd uses [JSON Schema][] inferred from the API description under test. The effective JSON Schema is taken from following places (the order goes from the highest priority to the lowest):

#### API Blueprint

1. [`+ Schema`][schema-section] section - provided custom JSON Schema ([Draft v4][] and [v3][Draft v3]) will be used.
2. [`+ Attributes`][attributes-section] section with data structure description in [MSON][] - API Blueprint parser automatically generates JSON Schema from MSON.
3. [`+ Body`][body-section] section with sample JSON payload - [Gavel.js][], which is responsible for validation in Dredd, automatically infers some basic expectations described below.

This order [exactly follows the API Blueprint specification][body-schema-attributes].

#### Swagger

1. [`response.schema`][response-schema] - provided JSON Schema will be used.
2. [`response.examples`][response-examples] with sample JSON payload - [Gavel.js][], which is responsible for validation in Dredd, automatically infers some basic expectations described below.

<a name="gavels-expectations"></a><!-- legacy MkDocs anchor -->

#### Gavel's Expectations

- All JSON keys on any level given in the sample must be present in the response's JSON.
- Response's JSON values must be of the same JSON primitive type.
- All JSON values can differ.
- Arrays can have additional items, type or structure of the items is not validated.
- Plain text must match perfectly.

### Custom Expectations

You can make your own custom expectations in [hooks](hooks.md). For instance, check out how to employ [Chai.js assertions](hooks-nodejs.md#using-chai-assertions).

## Making Your API Description Ready for Testing

It's very likely that your API description document will not be testable __as is__. This section should help you to learn how to solve the most common issues.

### URI Parameters

Both [API Blueprint][] and [Swagger][] allow usage of URI templates (API Blueprint fully implements [RFC6570][], Swagger templates are much simpler). In order to have an API description which is testable, you need to describe all required parameters used in URI (path or query) and provide sample values to make Dredd able to expand URI templates with given sample values. Following rules apply when Dredd interpolates variables in a templated URI, ordered by precedence:

1. Sample value (available in Swagger as [`x-example` vendor extension property](how-to-guides.md#example-values-for-request-parameters)).
2. Value of `default`.
3. First value from `enum`.

If Dredd isn't able to infer any value for a required parameter, it will terminate the test run and complain that the parameter is _ambiguous_.

> **Note:** The implementation of API Blueprint's request-specific parameters is still in progress and there's only experimental support for it in Dredd as of now.

### Request Headers

In [Swagger][] documents, HTTP headers are inferred from [`"in": "header"` parameters][parameters]. HTTP headers significant for content negotiation are inferred according to following rules:

- [`consumes`][consumes] is propagated as request's `Content-Type` header.
- [`produces`][produces] is propagated as request's `Accept` header.
- If request body parameters are specified as `"in": "formData"`, request's `Content-Type` header is set to `application/x-www-form-urlencoded`.

> **Note:** Processing `"in": "header"` parameters and inferring `application/x-www-form-urlencoded` from `"in": "formData"` parameters is not implemented yet ([apiaryio/fury-adapter-swagger#68](https://github.com/apiaryio/fury-adapter-swagger/issues/68), [apiaryio/fury-adapter-swagger#67](https://github.com/apiaryio/fury-adapter-swagger/issues/67)).

### Request Body

#### API Blueprint

The effective request body is taken from following places (the order goes from the highest priority to the lowest):

1. [`+ Body`][body-section] section with sample JSON payload.
2. [`+ Attributes`][attributes-section] section with data structure description in [MSON][] - API Blueprint parser automatically generates sample JSON payload from MSON.

This order [exactly follows the API Blueprint specification][body-schema-attributes].

#### Swagger

The effective request body is inferred from [`"in": "body"` and `"in": "formData"` parameters][parameters].

If body parameter has [`schema.example`][schema-example], it is used as a raw JSON sample for the request body. If it's not present, Dredd's [Swagger Adapter][] generates sample values from the JSON Schema provided in the [`schema`][schema] property. Following rules apply when the adapter fills values of the properties, ordered by precedence:

1. Value of `default`.
2. First value from `enum`.
3. Dummy, generated value.

### Empty Response Body

If there is no body example or schema specified for the response in your API description document, Dredd won't imply any assertions. Any server response will be considered as valid.

If you want to enforce the incoming body is empty, you can use [hooks](hooks.md):

```javascript
:[hooks example](../test/fixtures/response/empty-body-hooks.js)
```

In case of responses with 204 or 205 status codes Dredd still behaves the same way, but it warns about violating the [RFC7231](https://tools.ietf.org/html/rfc7231) when the responses have non-empty bodies.

## Choosing HTTP Transactions

#### API Blueprint

While [API Blueprint][] allows specifying multiple requests and responses in any
combination (see specification for the [action section][action-section]), Dredd
currently supports just separated HTTP transaction pairs like this:

```
+ Request
+ Response

+ Request
+ Response
```

In other words, Dredd always selects just the first response for each request.

> **Note:** Improving the support for multiple requests and responses is under development. Refer to issues [#25](https://github.com/apiaryio/dredd/issues/25) and [#78](https://github.com/apiaryio/dredd/issues/78) for details. Support for URI parameters specific to a single request within one action is also limited. Solving [#227](https://github.com/apiaryio/dredd/issues/227) should unblock many related problems. Also see [Multiple Requests and Responses](how-to-guides.md#multiple-requests-and-responses) guide for workarounds.

#### Swagger

The [Swagger][] format allows to specify multiple responses for a single operation.
By default Dredd tests only responses with `2xx` status codes. Responses with other
codes are marked as _skipped_ and can be activated in [hooks](hooks.md) - see the [Multiple Requests and Responses](how-to-guides.md#multiple-requests-and-responses) how-to guide.

In [`produces`][produces] and [`consumes`][consumes], only JSON media types are supported. Only the first JSON media type in `produces` is effective, others are skipped. Other media types are respected only when provided with [explicit examples][response-examples].

[Default response][default-responses] is ignored by Dredd unless it is the only available response. In that case, the default response is assumed to have HTTP 200 status code.

## Security

Depending on what you test and how, output of Dredd may contain sensitive data.

Mind that if you run Dredd in a CI server provided as a service (such as [CircleCI][], [Travis CI][], etc.), you are disclosing the CLI output of Dredd to third parties.

When using [Apiary Reporter and Apiary Tests](how-to-guides.md#using-apiary-reporter-and-apiary-tests), you are sending your testing data to [Apiary][] (Dredd creators and maintainers). See their [Terms of Service][] and [Privacy Policy][]. Which data exactly is being sent to Apiary?

- **Complete API description under test.** This means your API Blueprint or Swagger files. The API description is stored encrypted in Apiary.
- **Complete testing results.** Those can contain details of all requests made to the server under test and their responses. Apiary stores this data unencrypted, even if the original communication between Dredd and the API server under test happens to be over HTTPS. See [Apiary Reporter Test Data](data-structures.md#apiary-reporter-test-data) for detailed description of what is sent. You can [sanitize it before it gets sent](how-to-guides.md#removing-sensitive-data-from-test-reports).
- **Little meta data about your environment.** Contents of environment variables `TRAVIS`, `CIRCLE`, `CI`, `DRONE`, `BUILD_ID`, `DREDD_AGENT`, `USER`, and `DREDD_HOSTNAME` can be sent to Apiary. Your [hostname][], version of your Dredd installation, and [type][os-type], [release][os-release] and [architecture][os-arch] of your OS can be sent as well. Apiary stores this data unencrypted.

See also [guidelines on how to develop Apiary Reporter](contributing.md#hacking-apiary-reporter).

<a name="using-https-proxy"></a><!-- legacy MkDocs anchor -->

## Using HTTP(S) Proxy

You can tell Dredd to use HTTP(S) proxy for:

-  downloading API description documents<br>
   ([the positional argument][path-argument] or the [`--path` option][path-option] accepts also URL)
-  [reporting to Apiary][apiary-reporter]

Dredd respects `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `http_proxy`, `https_proxy`, and `no_proxy` environment variables. For more information on how those work see [relevant section][request-proxies] of the underlying library's documentation.

Dredd intentionally **does not support HTTP(S) proxies for testing**. Proxy can deliberately modify requests and responses or to behave in a very different way then the server under test. Testing over a proxy is, in the first place, testing of the proxy itself. That makes the test results irrelevant (and hard to debug).


[path-argument]: usage-cli.md#api-description-document-string
[path-option]: usage-cli.md#path-p
[apiary-reporter]: how-to-guides.md#using-apiary-reporter-and-apiary-tests
[request-proxies]: https://github.com/request/request#user-content-proxies

[Apiary]: https://apiary.io/
[Semantic Versioning]: https://semver.org/
[API Blueprint]: https://apiblueprint.org/
[Swagger]: https://swagger.io/
[Gavel.js]: https://github.com/apiaryio/gavel.js
[Gavel]: https://relishapp.com/apiary/gavel/docs
[MSON]: https://github.com/apiaryio/mson
[JSON Schema]: http://json-schema.org/
[Swagger Adapter]: https://github.com/apiaryio/fury-adapter-swagger/
[RFC6570]: https://tools.ietf.org/html/rfc6570
[Draft v4]: https://tools.ietf.org/html/draft-zyp-json-schema-04
[Draft v3]: https://tools.ietf.org/html/draft-zyp-json-schema-03

[CircleCI]: https://circleci.com/
[Travis CI]: https://travis-ci.org/
[Terms of Service]: https://apiary.io/tos
[Privacy Policy]: https://apiary.io/privacy
[hostname]: https://en.wikipedia.org/wiki/Hostname
[os-type]: https://nodejs.org/api/os.html#os_os_type
[os-release]: https://nodejs.org/api/os.html#os_os_release
[os-arch]: https://nodejs.org/api/os.html#os_os_arch

[schema-section]: https://apiblueprint.org/documentation/specification.html#def-schema-section
[parameters-section]: https://apiblueprint.org/documentation/specification.html#def-uriparameters-section
[attributes-section]: https://apiblueprint.org/documentation/specification.html#def-attributes-section
[body-section]: https://apiblueprint.org/documentation/specification.html#def-body-section
[request-section]: https://apiblueprint.org/documentation/specification.html#def-action-section
[action-section]: https://apiblueprint.org/documentation/specification.html#def-action-section
[body-schema-attributes]: https://apiblueprint.org/documentation/specification.html#relation-of-body-schema-and-attributes-sections

[produces]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-swaggerProduces
[consumes]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-swaggerConsumes
[response-headers]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responseHeaders
[schema]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-parameterSchema
[response-schema]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responseSchema
[response-examples]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responseExamples
[parameters]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-parameterObject
[operation-parameters]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-operationParameters
[paths-parameters]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-pathItemParameters
[swagger-parameters]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-swaggerParameters
[default-responses]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-responsesDefault
[schema-example]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-schemaExample
