.. _contributing:

Contributing Guidelines
=======================

Quick Start
-----------

Ideas
~~~~~

-  File an `issue <https://github.com/apiaryio/dredd/issues>`__.
-  Explain why you want the feature. How does it help you? What for do you want the feature?

Bugs
~~~~

-  File an `issue <https://github.com/apiaryio/dredd/issues>`__.
-  Ideally, write a failing test and send it as a Pull Request.

Coding
~~~~~~

-  Dredd is written in JavaScript `ES2015+ <https://tc39.github.io/ecma262/>`__.
-  Dredd uses :ref:`sem-rel`.

Recommended Workflow
^^^^^^^^^^^^^^^^^^^^

1.  Fork Dredd.
2.  Create a feature branch.
3.  Write tests.
4.  Write code.
5.  Lint what you created: ``npm run lint``
6.  Send a Pull Request.
7.  Make sure `test coverage <https://coveralls.io/github/apiaryio/dredd>`__ didn’t drop and all CI builds are passing.

.. _sem-rel:

Semantic Release and Conventional Changelog
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Releasing of new Dredd versions to npm is automatically managed by `Semantic Release <https://github.com/semantic-release/semantic-release>`__. Semantic Release makes sure correct version numbers get bumped according to the **meaning** of your changes once your PR gets merged to ``master``.

To make it work, it’s necessary to follow `Conventional Changelog <https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#user-content--git-commit-guidelines>`__. That basically means all commit messages in the project should follow a particular format::

    <type>: <subject>

Where ``<type>`` is:

-  ``feat`` - New functionality added
-  ``fix`` - Broken functionality fixed
-  ``perf`` - Performance improved
-  ``docs`` - Documentation added/removed/improved/…
-  ``chore`` - Package setup, CI setup, …
-  ``refactor`` - Changes in code, but no changes in behavior
-  ``test`` - Tests added/removed/improved/…

In the rare cases when your changes break backwards compatibility, the message must include string ``BREAKING CHANGE:``. That will result in bumping the major version.

Seems hard?

-  See `existing commits <https://github.com/apiaryio/dredd/commits/master>`__ as a reference
-  `Commitizen CLI <https://github.com/commitizen/cz-cli>`__ can help you to create correct commit messages
-  ``npm run lint`` validates format of your messages

Handbook for Contributors and Maintainers
-----------------------------------------

Maintainers
~~~~~~~~~~~

`Apiary <https://apiary.io/>`__ is the main author and maintainer of Dredd’s `upstream repository <https://github.com/apiaryio/dredd>`__. Currently responsible people are:

-  [@paraskakis](https://github.com/paraskakis) - product decisions, feature requests
-  [@honzajavorek](https://github.com/honzajavorek) - lead of development

Programming Language
~~~~~~~~~~~~~~~~~~~~

Dredd is written in `JavaScript (ES2015+) <https://tc39.github.io/ecma262/>`__ and is meant to be ran on server using Node.js. Before publishing to the npm registry, it is compiled to plain ES5 JavaScript code (throwaway ``lib`` directory).

Tests need pre-compiled every time because some integration tests use code linked from ``lib``. This is certainly a flaw and it slows down day-to-day development, but until we streamline our build pipeline, the ``lib`` dependency is necessary.

Also mind that `CoffeeScript <https://coffeescript.org>`__ is production dependency (not dev dependency), because it’s needed for running user-provided hooks written in CoffeeScript.

.. _compiled-vs-pure-javascript:

Compiled vs pure JavaScript
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Dredd uses `Drafter <https://github.com/apiaryio/drafter>`__ for parsing `API Blueprint <https://apiblueprint.org/>`__ documents. Drafter is written in C++11 and needs to be compiled during installation. Because that can cause a lot of problems in some environments, there’s also pure JavaScript version of the parser, `drafter.js <https://github.com/apiaryio/drafter.js>`__. Drafter.js is fully equivalent, but it can have slower performance. Therefore there’s `drafter-npm <https://github.com/apiaryio/drafter-npm/>`__ package, which tries to compile the C++11 version of the parser and uses the JavaScript equivalent in case of failure.

Dredd depends on the `drafter-npm <https://github.com/apiaryio/drafter-npm/>`__ package. That’s the reason why you can see ``node-gyp`` errors and failures during the installation process, even though when it’s done, Dredd seems to normally work and correctly parses API Blueprint documents.

Forcing the JavaScript version
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The ``--no-optional`` option forces the JavaScript version of Drafter and avoids any compilation attempts when installing Dredd:

.. code-block:: shell

   $ npm install -g dredd --no-optional

Troubleshooting the compilation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you need the performance of the C++11 parser, but you are struggling to get it installed, it’s usually because of the following problems:

-  **Your machine is missing a C++11 compiler.** See how to fix this on `Windows <https://github.com/apiaryio/drafter/wiki/Building-on-Windows>`__ or `Travis CI <https://github.com/apiaryio/protagonist/blob/master/.travis.yml>`__.
-  **npm was used with Python 3.** ``node-gyp``, which performs the compilation, doesn’t support Python 3. If your default Python is 3 (see ``python --version``), `tell npm to use an older version <http://stackoverflow.com/a/22433804/325365>`__.

Supported Node.js Versions
~~~~~~~~~~~~~~~~~~~~~~~~~~

Given the `table with LTS schedule <https://github.com/nodejs/Release>`__, only versions marked as **Maintenance** or **Active** are supported, until their **Maintenance End**. The testing matrix of Dredd’s CI builds must contain all currently supported versions and must not contain any unsupported versions. The same applies for the underlying libraries, such as `Dredd Transactions <https://github.com/apiaryio/dredd-transactions>`__ or `Gavel.js <https://github.com/apiaryio/gavel.js/>`__.

In following files the latest supported Node.js version should be used:

-  ``appveyor.yml`` - Windows CI builds
-  ``docs/install-node.sh`` - ReadTheDocs docs builds

Dependencies
~~~~~~~~~~~~

New versions of dependencies are monitored by `David <https://david-dm.org/apiaryio/dredd>`__ and/or `Greenkeeper <https://greenkeeper.io/>`__. Security issues are monitored by `Snyk <https://snyk.io/test/npm/dredd>`__.

Dependencies should not be specified in a loose way - only exact versions are allowed. Any changes to dependencies (version upgrades included) must be approved by Oracle before merged to ``master``. Dredd maintainers take care of the approval. For transparency, PRs with pending dependency approval are labeled respectively.

The internal Oracle policies about dependencies pay attention mainly to licenses. Before adding a new dependency or upgrading an existing one try to `make sure <https://github.com/davglass/license-checker>`__ the project and all its transitive dependencies feature standard permissive licenses, including correct copyright holders and license texts.

Versioning
~~~~~~~~~~

Dredd follows `Semantic Versioning <https://semver.org/>`__. To ensure certain stability of Dredd installations (e.g. in CI builds), users can pin their version. They can also use release tags:

-  ``npm install dredd`` - Installs the latest published version including experimental pre-release versions.
-  ``npm install dredd@stable`` - Skips experimental pre-release versions.

When releasing, make sure you respect the tagging:

-  To release pre-release, e.g. ``42.1.0-pre.7``, use just ``npm publish``.
-  To release any other version, e.g. ``42.1.0``, use ``npm publish && npm dist-tag add dredd@42.1.0 stable``.

Releasing process for standard versions is currently automated by `Semantic Release <https://github.com/semantic-release/semantic-release>`__. Releasing process for pre-releases is not automated and needs to be done manually, ideally from a special git branch.

Testing
~~~~~~~

Use ``npm test`` to run all tests. Dredd uses `Mocha <https://mochajs.org/>`__ as a test framework. It’s default options are in the ``test/mocha.opts`` file.

Windows
~~~~~~~

Dredd is tested on the `AppVeyor <https://www.appveyor.com/>`__, a Windows-based CI. There are still `several known limitations <https://github.com/apiaryio/dredd/issues?utf8=%E2%9C%93&q=is%3Aissue%20is%3Aopen%20label%3AWindows%20>`__ when using Dredd on Windows, but the intention is to support it without any compromises. Any help with fixing problems on Windows is greatly appreciated!

Linting
~~~~~~~

Dredd uses `eslint <https://eslint.org/>`__ to lint the JavaScript codebase. We are using `Airbnb’s styleguide <https://github.com/airbnb/javascript>`__ rules as a baseline with several rules disabled to allow us to have dirty post-decaffeinate code temporarily.

Linter is optional for local development to make easy prototyping and work with unpolished code, but it’s enforced on CI level. It is recommended you integrate `eslint <https://eslint.org/>`__ with your favorite editor so you see violations immediately during coding.

Changelog
~~~~~~~~~

Changelog is in form of `GitHub Releases <https://github.com/apiaryio/dredd/releases>`__. Currently it’s automatically generated by `Semantic Release <https://github.com/semantic-release/semantic-release>`__. See `above <#sem-rel>`__ to learn about how it works.

Documentation
~~~~~~~~~~~~~

Dredd’s documentation is written in `Markdown <https://en.wikipedia.org/wiki/Markdown>`__ using `Sphinx <http://www.sphinx-doc.org/>`__. `ReadTheDocs <https://readthedocs.org/>`__ is used to build and publish the documentation:

-  https://dredd.readthedocs.io - preferred long URL
-  https://dredd.rtfd.io - preferred short URL

Source of the documentation can be found in the `docs <https://github.com/apiaryio/dredd/tree/master/docs>`__ directory. To render Dredd’s documentation on your computer, you need Python 3 and Node.js installed.

Installation and Development
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

1.  Make sure ``node`` is an executable and ``npm install`` has been done for the Dredd directory. Extensions to the docs are written in Node.js and Sphinx needs to have a way to execute them.
2.  `Get Python 3 <https://www.python.org/downloads/>`__. On macOS, run ``brew install python3``. `ReadTheDocs <https://readthedocs.org/>`__ build the docs with Python 3.5, so make sure you have that or higher.
3.  Create a `virtual environment <https://docs.python.org/3/library/venv.html>`__ and activate it:

   .. code-block:: shell

      python3 -m venv ./venv
      . ./env/bin/activate

4.  Install dependencies for the docs: ``pip install -r docs/requirements.txt``

Once installed, you may use following commands:

-  ``npm run docs:build`` - Builds the documentation
-  ``npm run docs:serve`` - Runs live preview of the documentation on ``http://127.0.0.1:8000``

Installation on ReadTheDocs
^^^^^^^^^^^^^^^^^^^^^^^^^^^

The final documentation gets deployed on the `ReadTheDocs <https://readthedocs.org/>`__. The service, however, does not support Node.js. Therefore on ReadTheDocs, the ``conf.py`` configuration file for Sphinx runs ``docs/install-node.sh``, which installs Node.js locally, using `nvm <https://github.com/creationix/nvm>`__.

ToC and Markdown
^^^^^^^^^^^^^^^^

Traditionally, Sphinx only supported the `reStructuredText <http://www.sphinx-doc.org/en/stable/rest.html>`__ format. Thanks to the `recommonmark <https://github.com/rtfd/recommonmark>`__ project it’s possible to use also `Markdown <https://en.wikipedia.org/wiki/Markdown>`__, *almost* as a format native to Sphinx. Dredd’s docs are using the `AutoStructify <https://recommonmark.readthedocs.io/en/latest/auto_structify.html>`__ extension to be able to specify *toctree* and other stuff specific to reStructuredText. The ToC is generated from the *Contents* section in the ``docs/index.md`` file.

Node.js Extensions
^^^^^^^^^^^^^^^^^^

There are some extensions hooked into the build process of `Sphinx <http://www.sphinx-doc.org/>`__, modifying how the documents are processed. They’re written in Node.js, because:

-  It’s better to have them in the same language as Dredd.
-  This way they’re able to import source files (e.g. ``src/options.js``).

By default, `Hercule <https://www.npmjs.com/package/hercule>`__ is attached as an extension, which means you can use the ``:[Title](link.md)`` syntax for including other Markdown files. All other extensions are custom and are automatically loaded from the ``docs/_extensions`` directory.

The extension is expected to be a ``.js`` or ``.coffee`` script file, which takes ``docname`` as an argument, reads the Markdown document from ``stdin``, modifies it, and then prints it to ``stdout``. When in need of templating, extensions are expected to use the bundled ``ect`` templating engine.

Local References
^^^^^^^^^^^^^^^^

Currently the `recommonmark <https://github.com/rtfd/recommonmark>`__ project has still some limitations in how references to local files work. That’s why Dredd’s docs have a custom implementation, which also checks whether the destination exists and fails the build in case of broken link. You can use following syntax:

-  ``[Title](link.md)`` to link to other documents
-  ``[Title](link.md#section)`` to link to sections of other documents

Any ``id`` HTML attributes generated for headings or manual ``<a name="section"></a>`` anchors are considered as valid targets. While this feels very natural for a seasoned writer of Markdown, mind that it is much more error prone then `reStructuredText <http://www.sphinx-doc.org/en/stable/rest.html>`__\ ’s references.

Redirects
^^^^^^^^^

Redirects are documented in the ``docs/redirects.yml`` file. They need to be manually set in the `ReadTheDocs administration <https://readthedocs.org/dashboard/dredd/redirects/>`__. It’s up to Dredd maintainers to keep the list in sync with reality.

You can use the `rtd-redirects <https://github.com/honzajavorek/rtd-redirects>`__ tool to programmatically upload the redirects from ``docs/redirects.yml`` to ReadTheDocs admin interface.

Symlinked Contributing Docs
^^^^^^^^^^^^^^^^^^^^^^^^^^^

The ``docs/contributing.md`` file is a `symbolic link <https://en.wikipedia.org/wiki/Symbolic_link>`__ to the ``.github/CONTRIBUTING.md`` file, where the actual content lives. This is to be able to serve the same content also as `GitHub contributing guidelines <https://blog.github.com/2012-09-17-contributing-guidelines/>`__ when someone opens a Pull Request.

Coverage
~~~~~~~~

Dredd strives for as much test coverage as possible. `Coveralls <https://coveralls.io/github/apiaryio/dredd>`__ help us to monitor how successful we are in achieving the goal. If a Pull Request introduces drop in coverage, it won’t be accepted unless the author or reviewer provides a good reason why an exception should be made.

The Travis CI build uses following commands to deliver coverage reports:

-  ``npm run test:coverage`` - Tests Dredd and creates the ``./coverage/lcov.info`` file
-  ``npm run coveralls`` - Uploads the ``./coverage/lcov.info`` file to Coveralls

The first mentioned command goes like this:

1. `istanbul <https://github.com/gotwarlost/istanbul>`__ is used to instrument and cover the JavaScript code.
2. We run the tests on the instrumented code using Mocha with a special lcov reporter, which gives us information about which lines were executed in a standard lcov format.
3. Because some integration tests execute the ``bin/dredd`` script in a subprocess, we collect the coverage stats also in this file. The results are appended to a dedicated lcov file.
4. All lcov files are then merged into one using `lcov-result-merger <https://github.com/mweibel/lcov-result-merger>`__ and sent to Coveralls.

Notes
^^^^^

-  Hand-made combined Mocha reporter is used to achieve running tests and collecting coverage at the same time.
-  Both Dredd code and the combined reporter decide whether to collect coverage or not according to contents of the ``COVERAGE_DIR`` environment variable, which sets the directory for temporary LCOV files created during coverage collection. (If set, collecting takes place.)

.. _hacking-apiary-reporter:

Hacking Apiary Reporter
~~~~~~~~~~~~~~~~~~~~~~~

If you want to build something on top of the Apiary Reporter, note that
it uses a public API described in following documents:

-  `Apiary Tests API for anonymous test reports <https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApiAnonymous.apib>`__
-  `Apiary Tests API for authenticated test reports <https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApi.apib>`__

Following data are sent over the wire to Apiary:

-  :ref:`Apiary Reporter Test Data <apiary-reporter-test-data>`

There is also one environment variable you could find useful:

-  ``APIARY_API_URL='https://api.apiary.io'`` - Allows to override host of the Apiary Tests API.

Misc Tips
~~~~~~~~~

-  When using long CLI options in tests or documentation, please always use the notation with ``=`` wherever possible. For example, use ``--path=/dev/null``, not ``--path /dev/null``. While both should work, the version with ``=`` feels more like standard GNU-style long options and it makes arrays of arguments for ``spawn`` more readable.
-  Using ``127.0.0.1`` (in code, tests, documentation) is preferred over ``localhost`` (see `#586 <https://github.com/apiaryio/dredd/issues/586>`__).
-  Prefer explicit ``<br>`` tags instead of `two spaces <https://daringfireball.net/projects/markdown/syntax#p>`__ at the end of the line when writing documentation in Markdown.
