.. _hooks-js:
.. _hooks-nodejs:

Writing Dredd Hooks In Node.js
==============================

Usage
-----

::

   $ dredd apiary.apib http://127.0.0.1:30000 --hookfiles=./hooks*.js

API Reference
-------------

-  For ``before``, ``after``, ``beforeValidation``, ``beforeEach``, ``afterEach`` and ``beforeEachValidation`` a :ref:`Transaction Object <transaction>` is passed as the first argument to the hook function.
-  An array of Transaction Objects is passed to ``beforeAll`` and ``afterAll``.
-  The second argument is an optional callback function for async execution.
-  Any modifications on the ``transaction`` object are propagated to the actual HTTP transactions.
-  You can use ``hooks.log`` function inside the hook function to print yours debug messages and other information.

-  ``configuration`` (:ref:`docs <configuration-object-for-dredd-class>`) object is populated on the ``hooks`` object

Sync API
~~~~~~~~

.. code-block:: javascript

   var hooks = require('hooks');

   hooks.beforeAll(function (transactions) {
     hooks.log('before all');
   });

   hooks.beforeEach(function (transaction) {
     hooks.log('before each');
   });

   hooks.before("Machines > Machines collection > Get Machines", function (transaction) {
     hooks.log("before");
   });

   hooks.beforeEachValidation(function (transaction) {
     hooks.log('before each validation');
   });

   hooks.beforeValidation("Machines > Machines collection > Get Machines", function (transaction) {
     hooks.log("before validation");
   });

   hooks.after("Machines > Machines collection > Get Machines", function (transaction) {
     hooks.log("after");
   });

   hooks.afterEach(function (transaction) {
     hooks.log('after each');
   });

   hooks.afterAll(function (transactions) {
     hooks.log('after all');
   })

Async API
~~~~~~~~~

When the callback is used in the hook function, callbacks can handle asynchronous function calls.

.. code-block:: javascript

   var hooks = require('hooks');

   hooks.beforeAll(function (transactions, done) {
     hooks.log('before all');
     done();
   });

   hooks.beforeEach(function (transaction, done) {
     hooks.log('before each');
     done();
   });

   hooks.before("Machines > Machines collection > Get Machines", function (transaction, done) {
     hooks.log("before");
     done();
   });

   hooks.beforeEachValidation(function (transaction, done) {
     hooks.log('before each validation');
     done();
   });

   hooks.beforeValidation("Machines > Machines collection > Get Machines", function (transaction, done) {
     hooks.log("before validation");
     done();
   });

   hooks.after("Machines > Machines collection > Get Machines", function (transaction, done) {
     hooks.log("after");
     done();
   });

   hooks.afterEach(function (transaction, done) {
     hooks.log('after each');
     done();
   });

   hooks.afterAll(function (transactions, done) {
     hooks.log('after all');
     done();
   })

Examples
--------

How to Skip Tests
~~~~~~~~~~~~~~~~~

Any test step can be skipped by setting ``skip`` property of the ``transaction`` object to ``true``.

.. code-block:: javascript

   var before = require('hooks').before;

   before("Machines > Machines collection > Get Machines", function (transaction) {
     transaction.skip = true;
   });

.. _sharing-data-between-steps-in-request-stash:

Sharing Data Between Steps in Request Stash
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You may pass data between test steps using the response stash.

.. code-block:: javascript

   var hooks = require('hooks');
   var before = hooks.before;
   var after = hooks.after;

   var responseStash = {};

   after("Machines > Machines collection > Create Machine", function (transaction) {

     // saving HTTP response to the stash
     responseStash[transaction.name] = transaction.real;
   });


   before("Machines > Machine > Delete a machine", function (transaction) {
     //reusing data from previous response here
     var machineId = JSON.parse(responseStash['Machines > Machines collection > Create Machine'])['id'];

     //replacing id in URL with stashed id from previous response
     var url = transaction.fullPath;
     transaction.fullPath = url.replace('42', machineId);
   });

Failing Tests Programmatically
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can fail any step by setting ``fail`` property on ``transaction`` object to ``true`` or any string with descriptive message.

.. code-block:: javascript

   var before = require('hooks').before;

   before("Machines > Machines collection > Get Machines", function (transaction) {
     transaction.fail = "Some failing message";
   });

.. _using-chai-assertions:

Using Chai Assertions
~~~~~~~~~~~~~~~~~~~~~

Inside hook files, you can require `Chai <https://www.chaijs.com/>`__ and use its ``assert``, ``should`` or ``expect`` interface in hooks and write your custom expectations. Dredd catches Chai’s expectation error in hooks and makes transaction to fail.

.. code-block:: javascript

   var hooks = require('hooks');
   var before = hooks.before;
   var assert = require('chai').assert;

   after("Machines > Machines collection > Get Machines", function (transaction) {
     assert.isBelow(transaction.real.body.length, 100);
   });

.. _modifying-transaction-request-body-prior-to-execution:

Modifying Transaction Request Body Prior to Execution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: javascript

   var hooks = require('hooks');
   var before = hooks.before;

   before("Machines > Machines collection > Get Machines", function (transaction) {
     // parse request body from API description
     var requestBody = JSON.parse(transaction.request.body);

     // modify request body here
     requestBody['someKey'] = 'someNewValue';

     // stringify the new body to request
     transaction.request.body = JSON.stringify(requestBody);
   });

Modifying Multipart Transaction Request Body Prior to Execution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Dependencies:

- `multi-part <https://www.npmjs.com/package/multi-part>`__
- `stream-to-string <https://www.npmjs.com/package/stream-to-string>`__

.. code-block:: javascript

   const hooks = require('hooks');
   const fs = require('fs');
   const Multipart = require('multi-part');
   const streamToString = require('stream-to-string');

   var before = hooks.before;

   before("Machines > Machines collection > Create Machines", async function (transaction, done) {
       const form = new Multipart();
       form.append('title', 'Foo');
       form.append('photo', fs.createReadStream('./bar.jpg'));
       transaction.request.body = await streamToString(form.getStream());
       transaction.request.headers['Content-Type'] = form.getHeaders()['content-type'];
       done();
   });

Adding or Changing URI Query Parameters to All Requests
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: javascript

   var hooks = require('hooks');

   hooks.beforeEach(function (transaction) {
     // add query parameter to each transaction here
     var paramToAdd = "api-key=23456"
     if(transaction.fullPath.indexOf('?') > -1){
       transaction.fullPath += "&" + paramToAdd;
     } else{
       transaction.fullPath += "?" + paramToAdd;
     }
   });

Handling sessions
~~~~~~~~~~~~~~~~~

.. code-block:: javascript

   var hooks = require('hooks');
   var stash = {};

   // hook to retrieve session on a login
   hooks.after('Auth > /remoteauth/userpass > POST', function (transaction) {
     stash['token'] = JSON.parse(transaction.real.body)['sessionId'];
   });

   // hook to set the session cookie in all following requests
   hooks.beforeEach(function (transaction) {
     if(stash['token'] != undefined){
       transaction.request['headers']['Cookie'] = "id=" + stash['token'];
     };
   });

Remove trailing newline character in expected *plain text* bodies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: javascript

   var hooks = require('hooks');

   hooks.beforeEach(function(transaction) {
     if (transaction.expected.headers['Content-Type'] === 'text/plain') {
       transaction.expected.body = transaction.expected.body.replace(/^\s+|\s+$/g, "");
     }
   });

Using Babel
~~~~~~~~~~~

You can use `Babel <https://babeljs.io/>`__ for support of all the latest JS syntactic coolness in Dredd by using `babel-register <https://www.npmjs.com/package/@babel/register>`__:

::

   npm install -g babel-register @babel/preset-env
   echo '{ "presets": [["env", { "target": { "node":6 } }]] }' > .babelrc
   dredd test/fixtures/single-get.apib http://127.0.0.1:3000 --hookfiles=./es2015.js --require=@babel/register

Using CoffeScript
~~~~~~~~~~~~~~~~~

You can use `CoffeeScript <https://coffeescript.org>`__  in hooks by registering it as a compiler.

::

   dredd test/fixtures/single-get.apib http://127.0.0.1:3000 --hookfiles=./hooks.coffee --require=coffeescript/register
