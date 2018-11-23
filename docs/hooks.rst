.. _hooks:

Hook Scripts
============

Similar to any other testing framework, Dredd supports executing code around each test step. Hooks are code blocks executed in defined stage of :ref:`execution lifecycle <execution-life-cycle>`. In the hooks code you have an access to compiled HTTP :ref:`transaction object <transaction-object-structure>` which you can modify.

Hooks are usually used for:

-  loading db fixtures
-  cleanup after test step or steps
-  handling authentication and sessions
-  passing data between transactions (saving state from responses to *stash*)
-  modifying request generated from API description
-  changing generated expectations
-  setting custom expectations
-  debugging via logging stuff

Languages
---------

You can interact with your server implementation in following languages:

-  :ref:`Go <hooks-go>`
-  :ref:`JavaScript (Sandboxed) <hooks-js-sandbox>`
-  :ref:`Node.js <hooks-nodejs>`
-  :ref:`Perl <hooks-perl>`
-  :ref:`PHP <hooks-php>`
-  :ref:`Python <hooks-python>`
-  :ref:`Ruby <hooks-ruby>`
-  :ref:`Rust <hooks-rust>`

Dredd doesn’t speak your language? :ref:`It’s very easy to write support for your language. <hooks-new-language>` Your contribution is more than welcome!

Using Hook Files
----------------

To use a hook file with Dredd, use the :option:`--hookfiles` flag in the command line. You can use this flag multiple times or use a `glob <https://www.npmjs.com/package/glob>`__ expression for loading multiple hook files. Dredd executes hook files in alphabetical order.

Example:

.. code-block:: shell

   $ dredd single-get.apib http://machines.apiary.io --hookfiles=*_hooks.*

.. _getting-transaction-names:

Getting Transaction Names
-------------------------

For addressing specific test steps is used the **transaction names** of the compiled HTTP transactions (*actions*) from the API description.

In order to retrieve transaction names please run Dredd with the :option:`--names` option last and it will print all available names of transactions.

For example, given an API Blueprint file ``api-description.apib`` as following:

.. code-block:: apiblueprint

   FORMAT: 1A

   # Machines API

   # Group Machines

   # Machines collection [/machines]

   ## Get Machines [GET]

   - Response 200 (application/json; charset=utf-8)

       [{"type": "bulldozer", "name": "willy"}]

Run this command to retrieve all transaction names:

.. code-block:: shell

   $ dredd single-get.apib http://machines.apiary.io --names
   info: Machines > Machines collection > Get Machines

The ``Machines > Machines collection > Get Machines`` is the name of a transaction which you can use in your hooks. The same approach works also for OpenAPI 2 documents.

.. _types-of-hooks:

Types of Hooks
--------------

Dredd supports following types of hooks:

-  ``beforeAll`` called at the beginning of the whole test run
-  ``beforeEach`` called before each HTTP transaction
-  ``before`` called before some specific HTTP transaction
-  ``beforeEachValidation`` called before each HTTP transaction is validated
-  ``beforeValidation`` called before some specific HTTP transaction is validated
-  ``after`` called after some specific HTTP transaction regardless its result
-  ``afterEach`` called after each HTTP transaction
-  ``afterAll`` called after whole test run

Refer to :ref:`Dredd execution lifecycle <execution-life-cycle>` when is each hook executed.

.. _transaction-object-structure:

Transaction Object Structure
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The main purpose of hooks is to work with the transaction object they get as the first argument, in order to inspect or modify Dredd’s behavior. See :ref:`transaction object reference <transaction>` to learn more about its contents.
