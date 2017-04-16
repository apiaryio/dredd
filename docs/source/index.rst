.. include:: links.rst

.. toctree::
   :maxdepth: 2


Dredd — HTTP API Validation Tool
=================================

Dredd is a command-line tool for validating API documentation written in `API Blueprint`_ format against its backend implementation. With `Dredd`_ you can easily plug your API documentation into the Continous Integration system like `Travis CI`_ or `Jenkins`_ and have API documentation up-to-date, all the time. `Dredd`_ uses the `Gavel`_ for judging if a particular API response is valid or if it isn't. If you are curious about how decisions are made, please refer to Gavel's behavior specification.


Dredd

- is a testing framework for testing HTTP APIs and their documentation.
- tests if HTTP API backend's responses conform to examples given in API blueprint.
- assures all the time up-to-date documentation.
- improves developer experience of your API.
- is an open-source made by Apiary

- Dredd and API blueprint cover complete API development lifecycle
  - Design
  - Local test-driven development
  - Continuous integration
  - Post-deployment live checks with continuous delivery


Getting started testing your API
================================
- Create a blueprint


- npm install -g dredd
- dredd init
- dredd

Automatic expectations
======================
Dredd automatically generates expectations on HTTP responses based on examples in the blueprint.

You can easily write additional, custom imperative expectations in hooks.

Headers expectations
--------------------

- All headers given in example must be present in the response
- Only values of headers significant for content negotiation are validated
- All other headers values can differ.

Body expectations
-----------------

- All JSON keys on any level given in the example must be present in the response JSON
- Response JSON values must be of same JSON primitive type
- All JSON values can differ
- Arrays can have additional items, type or structure is not valdated.
- Plain text must match perectly
- If JSON Schema v4 or JSON Schema v3 is given in the blueprint, JSON response must be valid against this schema nd JSON example is ignored.


Example application
===================



- More complex example application in Express.js http://github.com/apiaryio/dredd-example
- Example application with Dredd in Ruby on Rails https://github.com/theodorton/dredd-test-rails

Using Apiary Test Inspector
========================================
- Anonymous
- Saving under your account
- Screenshot

Testing API Documentation
=========================

Documentation testability
-------------------------

API Blueprint allows usage of URI templates. If you want to have API documentation to be complete and testable, do not forget to describe all URI used parameters and provide examples to make Dredd able to expand URI templates with given example values.

Isolate actions and use fixtures in hooks
-----------------------------------------

API Blueprint structure conforms to the REST paradigm, so in the API Blueprint are documented Resources and their Actions.

It's very likely that your blueprint will not be testable as-is, because actions in the reference will not be sorted in proper order for API's application logic workflow.

Proper testing of API documentation with Dredd is all about isolating each resource action with *hooks* scripts executing code before and after each HTTP transaction to do proper fixtures setup and teardown.

It's a simple analogy to *unit testing* of your code. In unit testing, each unit should be testable without any dependency on other units or previous tests.

Each API action should be run in its isolated context.

It's usual that you discuss an action in the API documentation for some entity deletion before an action for re-using this deleted entity.

Example
-------

- categories
  - create
- category
  - delete
- items
  - add item to the category

In this case, you will have to write a `before` hook for adding a db fixture creating a category executed before HTTP call to action creating item in this category.

hooks


Testing API Workflows
=====================

If you want to test some sequence of HTTP steps (workflow or scenario) in you API apart of your API reference. You can run Dredd with multiple blueprints by adding  `--path` argument

Unlike API reference tests, scenarios or workflows steps are run in shared context.

Continuous integration and test harness
======================================


  - Dredd init
  - Circle.yml
    "dependencies:
      pre:
        - npm install -g dredd
    test:
      pre:
        - dredd"
  - .Travis.yml
    "before_install:
      - npm install -g dredd
    before_script:
      - dredd"

Adding Dredd to your existing test harness

- grunt-dredd grunt task wrapper https://github.com/mfgea/grunt-dredd
- dredd-rack rake task and rack wrapper https://github.com/gonzalo-bulnes/dredd-rack

Authenticated APIs
==================


    - Dredd supports all possible authentications of HTTP API like:
      - basic
      - digest
      - oauth 1.0a
      - oauth 2.0
      - adding csrf tokens

    - Using HTTP basic authentication
      - --user user:password
    - Adding header to all requests
      - from command line
        - -h "Authorization: Basic YmVuOnBhc3M="
    - Adding URL query parameter to all requests
      - code snippet for hooks

Using hook scripts
==================

Similer to any other testing framework, Dredd supports executing code around each test step.
Hooks are usually used for:

- loading db fixtures
- cleanup after test step
- passing data between transactions (saving state from responses)
- modifying request generated from blueprint
- changing generated expectations
- setting custom expectations


How to use hooks
----------------

Hooks JS API reference
----------------------

Ruby hooks workaround
---------------------

Isolating transactions with before and after hooks
--------------------------------------------------

Skipping tests programatically
------------------------------

Passing data between tests in scenarios and workflows
-----------------------------------------------------

Failing tests programatically
-----------------------------

Using Chai assertions in JS hooks
------------------------------

Modifying transactions between execution
----------------------------------------

Adding cookies and sessions
---------------------------

Sandboxed hooks
---------------

Using multipart requests
========================

Multiple requests and responses under one action
================================================


CLI interface
=============

JS interface
============

Dredd can be run programatically in JavaScript like Node.js

Execution lifecycle
===================

- 1 load and parse blueprints
  - report parsing warnings
- 2 pre-run blueprint check
  - missing example values for URI template parameters
  - required parameters present in URI
  - not parseable json bodies
  - not valid uri parameters
  - invalid uri templates
-  3 compile HTTP transactions from blueprint
  - inherit headers
  - inherit parameters
  - expand uri templates with parameters
- 4 load hooks
- 5 test run
  - report test run start
  - run beforeAll hooks
  - for each compiled transaction
    - report test start
    - run before hook
    - send request
    - receive response
    - run after hook
    - report test end with result for in-progress reporting
  - run afterAll Hooks
- 6 report test run end with result statistics

