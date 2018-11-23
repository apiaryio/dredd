.. include:: _links.rst
.. _installation:

Installation
============

There are several options how to run Dredd on your machine or in your :ref:`continuous-integration`.


.. _install-docker:

Docker
------

Installing Dredd using `Docker <https://docs.docker.com>`__ is the easiest and the most hassle-free option for every major operating system.

.. tabs::

   .. group-tab:: macOS, Linux

      Following line runs the ``dredd`` command using the `apiaryio/dredd <https://hub.docker.com/r/apiaryio/dredd/>`__ Docker image::

         $ docker run -it -v $PWD:/api -w /api apiaryio/dredd dredd

      As an example of how to pass arguments, following line runs the ``dredd init`` command::

         $ docker run -it -v $PWD:/api -w /api apiaryio/dredd dredd init

   .. group-tab:: Windows

      Following line runs the ``dredd`` command using the `apiaryio/dredd <https://hub.docker.com/r/apiaryio/dredd/>`__ Docker image::

         C:\Users\Susan> docker run -it -v ${pwd}:/api -w /api apiaryio/dredd dredd

      As an example of how to pass arguments, following line runs the ``dredd init`` command::

         C:\Users\Susan> docker run -it -v ${pwd}:/api -w /api apiaryio/dredd dredd init


.. _install-npm:

npm
---

Dredd is a command-line application written in JavaScript, or to be more precise, in `Node.js <https://nodejs.org>`__. If Docker isn't an option for you, it's possible to install Dredd using the `npm <https://www.npmjs.com>`__ package manager. To install Dredd's dependencies, you'll also need to have `Git <https://git-scm.com/>`__ available.


.. _install-nodejs:

Installing Node.js
~~~~~~~~~~~~~~~~~~

.. tabs::

   .. group-tab:: macOS

      - If you’re using `Homebrew <https://brew.sh/>`__, run ``brew install node``
      - Otherwise `download Node.js <https://nodejs.org/en/download/>`__ from the official website and install it using the downloaded installer
      - Make sure both ``node --version`` and ``npm --version`` work in your Terminal
      - Node.js needs to be at least version 6

   .. group-tab:: Linux

      - `Install Node.js as a system package <https://nodejs.org/en/download/package-manager/>`__
      - In case your Linux distribution calls the Node.js binary ``nodejs``, please `follow this advice <https://stackoverflow.com/a/18130296/325365>`__ to have it as ``node`` instead
      - Make sure both ``node --version`` and ``npm --version`` work in your Terminal
      - Node.js needs to be at least version 6

   .. group-tab:: Windows

      - `Download Node.js <https://nodejs.org/en/download/>`__ from the official website and install it using the downloaded installer
      - Make sure both ``node --version`` and ``npm --version`` work in your Command Prompt
      - Node.js needs to be at least version 6

.. note::
   You can also use `nvm <https://github.com/creationix/nvm>`__ to install Node.js on your computer.

.. warning::
   If your internet connection is restricted (VPN, firewall, proxy), you need to run following additional commands to configure npm:

   .. code-block:: text

      npm config set proxy "http://proxy.example.com:8080"
      npm config set https-proxy "https://proxy.example.com:8080"

   Otherwise you'll get similar errors during Dredd installation:

   .. code-block:: text

      npmERR! Cannot read property 'path' of null
      npmERR!code ECONNRESET
      npmERR!network socket hang up

   Later be sure to read :ref:`how to set up Dredd to correctly work with proxies <using-https-proxy>`.


.. _install-git:

Installing Git
~~~~~~~~~~~~~~

Git is needed to install some of Dredd's dependencies (see :ghissue:`gavel.js#83`).

.. tabs::

   .. group-tab:: macOS

      - First try whether Git isn't already available by running ``git --version``
      - If not and you're using `Homebrew <https://brew.sh/>`__, run ``brew install git``
      - Otherwise `download Git <https://git-scm.com/downloads>`__ from the official website and install it using the downloaded installer
      - Make sure ``git --version`` works in your Terminal

   .. group-tab:: Linux

      - First try whether Git isn't already available by running ``git --version``
      - If not, `install Git as a system package <https://git-scm.com/download/linux>`__
      - Make sure ``git --version`` works in your Terminal

   .. group-tab:: Windows

      - First try whether Git isn't already available by running ``git --version``
      - If not, `download Git <https://git-scm.com/downloads>`__ from the official website and install it using the downloaded installer
      - Make sure ``git --version`` works in your Command Prompt

.. warning::
   If your internet connection is restricted (VPN, firewall, proxy), you need to run following additional commands to configure Git. Even when it is :80, always specify the port number in the commands below:

   .. code-block:: text

      git config --global http.proxy "http://proxy.example.com:8080"
      git config --global https.proxy "https://proxy.example.com:8080"

   Otherwise you'll get similar errors during Dredd installation:

   .. code-block:: text

      Error: Command failed: git config --get remote.origin.url
      ssh: connect to host github.com port 22: Operation timed out
      fatal: Could not read from remote repository.

   Later be sure to read :ref:`how to set up Dredd to correctly work with proxies <using-https-proxy>`.


.. _install-dredd:

Installing Dredd
~~~~~~~~~~~~~~~~

Now that you have everything prepared, you can finally run npm to install Dredd:

.. code-block:: text

   npm install dredd --global --no-optional

.. warning::
   If you get ``EACCES`` permissions errors, run the command again with ``sudo`` or try `one of the officially recommended solutions <https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally>`__.

You can verify Dredd is correctly installed by printing its version number:

.. code-block:: text

   dredd --version

Now you can :ref:`start using Dredd <quickstart>`!


Optional steps
--------------

Adding Dredd as dev dependency
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If your API project is also an npm package, you may want to add Dredd as a dev dependency instead of installing it globally.

- Make sure your project is an npm package with a ``package.json`` file
- In the root of the project run ``npm install dredd --save-dev --no-optional``
- Once the installation is complete, you can run Dredd from the root of the project as ``npx dredd``

This is how Dredd is installed in the `dredd-example <https://github.com/apiaryio/dredd-example>`__ repository, so you may want to see it for inspiration.

When using npm with your API project, you might notice it tries to compile :ref:`C++ dependencies <install-cpp>` again and again, which means every npm command takes very long until it finishes. The workaround is to append ``--no-optional`` every time to your npm command. We're working on a better solution together with the team behind the C++ projects we depend on (:ghissue:`drafter-npm#16`).


.. _install-cpp:

Installing C++ dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~

The `API Blueprint`_ parser is written in C++, which needs to be compiled during Dredd's installation process. The ``--no-optional`` npm option forces Dredd to fall back to a slower, but easy to install pure JavaScript version of the parser:

.. code-block:: text

   npm install dredd --global --no-optional

This is ideal in case you are

- using Dredd exclusively with `OpenAPI 2`_,
- using Dredd with small `API Blueprint`_ files,
- using Dredd on Windows or other environments with complicated C++ compiler setup.

To gain more performance when parsing larger API Blueprint files, you may want to install Dredd without the ``--no-optional`` npm option. However, first check following requirements:

Have a modern C++ compiler
   Check out the `list of supported compilers <https://github.com/apiaryio/drafter/#user-content-compiler-support>`__. See how to compile on `Windows <https://github.com/apiaryio/drafter/wiki/Building-on-Windows>`__ or `Travis CI <https://github.com/apiaryio/protagonist/blob/master/.travis.yml>`__.

Make sure npm uses Python 2
   ``node-gyp``, which performs the compilation, doesn’t support Python 3 yet. If your default Python is 3 (see ``python --version``), `tell npm to use an older version <https://stackoverflow.com/a/22433804/325365>`__.

Now you can install Dredd like this:

.. code-block:: text

   npm install dredd --global

If you see errors mentioning ``node-gyp``, ``gyp``, or ``python``, the compilation has failed:

.. code-block:: text

   gyp ERR! stack Error: `gyp` failed with exit code: 1
   gyp ERR! not ok
   npm WARN optional SKIPPING OPTIONAL DEPENDENCY: protagonist@1.6.8 (node_modules/protagonist):
   npm WARN optional SKIPPING OPTIONAL DEPENDENCY: protagonist@1.6.8 install: `node-gyp rebuild`
   npm WARN optional SKIPPING OPTIONAL DEPENDENCY: Exit status 1

Despite that, Dredd itself will install and work correctly as in such case it falls back to the JavaScript version of the parser.

.. note::
   See also :ref:`cpp-dependencies` in the guide through Dredd's internals.
