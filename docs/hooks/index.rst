.. include:: ../_links.rst


.. _hook-scripts:
.. _hooks:

Hooks
=====

Dredd supports *hooks*, which are blocks of arbitrary code that run before or after each test step. The concept is similar to XUnit's ``setUp`` and ``tearDown`` functions, `Cucumber hooks <https://docs.cucumber.io/cucumber/api/#hooks>`__, or `Git hooks <https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks>`__. Hooks are usually used for:

-  Loading database fixtures,
-  cleaning up after test step(s),
-  handling auth and sessions,
-  passing data between transactions (saving state from responses),
-  modifying a request generated from the API description,
-  changing generated expectations,
-  setting custom expectations,
-  debugging by logging stuff.


Getting started
---------------

Let's have a description of a blog API, which allows to list all articles, and to publish a new one.

.. tabs::

   .. group-tab:: API Blueprint

      .. literalinclude:: ../../test/fixtures/blog/api.apib
         :language: apiblueprint

   .. group-tab:: OpenAPI 2

      .. literalinclude:: ../../test/fixtures/blog/api.yaml
         :language: openapi2

Now let's say the real instance of the API has the POST request protected so it is not possible for everyone to publish new articles. We do not want to hardcode secret tokens in our API description, but we want to get Dredd to pass the auth. This is where the hooks can help.


Writing hooks
~~~~~~~~~~~~~

Hooks are functions, which are registered to be ran for a specific test step (HTTP transaction) and at a specific point in Dredd's :ref:`execution life cycle <execution-life-cycle>`. Hook functions take one or more `transaction objects <transaction>`__, which they can modify. Let's use hooks to add an `Authorization header <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization>`__ to Dredd's request.

Dredd supports :ref:`writing hooks in multiple programming languages <supported-languages>`, but we'll go with JavaScript hooks in this tutorial as they're available out of the box.

.. tabs::

   .. group-tab:: API Blueprint

      Let's create a file called ``hooks.js`` with the following content:

      .. literalinclude:: ../../test/fixtures/blog/hooks-apib.js
         :language: javascript

      As you can see, we're registering the hook function to be executed **before** the HTTP transaction ``Articles > Publish an article``. This path-like identifier is a :ref:`transaction name <transaction-names>`.

   .. group-tab:: OpenAPI 2

      Let's create a file called ``hooks.js`` with the following content:

      .. literalinclude:: ../../test/fixtures/blog/hooks-openapi2.js
         :language: javascript

      As you can see, we're registering the hook function to be executed **before** the HTTP transaction ``Articles > Publish an article > 201 > application/json``. This path-like identifier is a :ref:`transaction name <transaction-names>`.


Running Dredd with hooks
~~~~~~~~~~~~~~~~~~~~~~~~

With the API instance running locally at ``http://127.0.0.1``, you can now run Dredd with hooks using the :option:`--hookfiles` option:

.. tabs::

   .. group-tab:: API Blueprint

      .. code-block:: text

         dredd ./blog.apib http://127.0.0.1 --hookfiles=./hooks.js

   .. group-tab:: OpenAPI 2

      .. code-block:: text

         dredd ./blog.yaml http://127.0.0.1 --hookfiles=./hooks.js

Now the tests should pass even if publishing new article requires auth.


.. _supported-languages:

Supported languages
-------------------

Dredd itself is written in JavaScript, so it supports :ref:`JavaScript hooks <hooks-js>` out of the box. Running hooks in other languages requires installing a dedicated *hook handler*. Supported languages are:

.. toctree::
   :maxdepth: 1

   JavaScript <js>
   Go <go>
   Perl <perl>
   PHP <php>
   Python <python>
   Ruby <ruby>
   Rust <rust>

.. toctree::
   :hidden:

   New language <new-language>

.. note::

   If you don't see your favorite language, :ref:`it's fairly easy to contribute support for it <hooks-new-language>`! Join the :ref:`Contributors Hall of Fame <maintainers>` where we praise those who added support for additional languages.

   (Especially if your language of choice is **Java**, there's an eternal fame and glory waiting for you - see :ghissue:`#875`)


.. _transaction-names:
.. _getting-transaction-names:

Transaction names
-----------------

Transaction names are path-like strings, which allow hook functions to address specific HTTP transactions. They intuitively follow the structure of your API description document.

You can get a list of all transaction names available in your API description document by calling Dredd with the :option:`--names` option:

.. tabs::

   .. group-tab:: API Blueprint

      .. code-block:: text
         :emphasize-lines: 3, 5

         $ dredd ./blog.apib http://127.0.0.1 --names
         info: Beginning Dredd testing...
         info: Articles > List articles
         skip: GET (200) /articles
         info: Articles > Publish an article
         skip: POST (201) /articles
         complete: 0 passing, 0 failing, 0 errors, 2 skipped, 2 total
         complete: Tests took 9ms

      As you can see, the document ``./blog.apib`` contains two transactions, which you can address in hooks as:

      - ``Articles > List articles``
      - ``Articles > Publish an article``

   .. group-tab:: OpenAPI 2

      .. code-block:: text
         :emphasize-lines: 3, 5

         $ dredd ./blog.yaml http://127.0.0.1 --names
         info: Beginning Dredd testing...
         info: Articles > List articles > 200 > application/json
         skip: GET (200) /articles
         info: Articles > Publish an article > 201 > application/json
         skip: POST (201) /articles
         complete: 0 passing, 0 failing, 0 errors, 2 skipped, 2 total
         complete: Tests took 9ms

      As you can see, the document ``./blog.yaml`` contains two transactions, which you can address in hooks as:

      - ``Articles > List articles > 200 > application/json``
      - ``Articles > Publish an article > 201 > application/json``

.. note::
   The transaction names and the :option:`--names` workflow mostly do their job, but with `many documented flaws <https://github.com/apiaryio/dredd/labels/Epic%3A%20Transaction%20Names>`__. A successor to transaction names is being designed in :ghissue:`#227`


.. _types-of-hooks:

Types of hooks
--------------

Hooks get executed at specific points in Dredd's :ref:`execution life cycle <execution-life-cycle>`. Available types of hooks are:

-  ``beforeAll`` called at the beginning of the whole test run
-  ``beforeEach`` called before each HTTP transaction
-  ``before`` called before a specific HTTP transaction
-  ``beforeEachValidation`` called before each HTTP transaction is validated
-  ``beforeValidation`` called before a specific HTTP transaction is validated
-  ``after`` called after a specific HTTP transaction regardless its result
-  ``afterEach`` called after each HTTP transaction
-  ``afterAll`` called after whole test run


.. _hooks-docker:

Hooks inside Docker
-------------------

As mentioned in :ref:`supported-languages`, running hooks written in languages other than JavaScript requires a dedicated hook handler. Hook handler is a separate process, which communicates with Dredd over a TCP socket.

If you're :ref:`running Dredd inside Docker <docker>`, you may want to use a separate container for the hook handler and then run all your containers together as described in the :ref:`docker-compose` section.

However, hooks were not originally designed with this scenario in mind. Dredd gets a name of (or path to) the hook handler in :option:`--language` and then starts it as a child process. To work around this, `fool Dredd with a dummy script <https://github.com/apiaryio/dredd/issues/748#issuecomment-285355519>`__ and set :option:`--hooks-worker-handler-host` together with :option:`--hooks-worker-handler-port` to point Dredd's TCP communication to the other container.

.. note::
    The issue described above is tracked in :ghissue:`#755`.
