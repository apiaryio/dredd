.. include:: _links.rst
.. _installation:

Installation
============

There are several options how to run Dredd on your machine or in your :ref:`continuous-integration`.


.. _docker:
.. _install-docker:

Docker
------

If you are familiar with `Docker <https://docs.docker.com>`__, you can get started with Dredd quickly by using the ready-made `apiaryio/dredd <https://hub.docker.com/r/apiaryio/dredd/>`__ image. Specifics of running Dredd inside Docker are:

- you won't be able to use the :option:`--server` option (see :ref:`docker-compose`)
- setting up non-JavaScript :ref:`hooks <hooks>` is less straightforward (see :ref:`hooks-docker`)

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


.. _docker-compose:

Docker Compose
~~~~~~~~~~~~~~

Inside Docker it's impossible for Dredd to manage child processes, so the :option:`--server` and :option:`--language` options won't work properly.

Instead, you should have separate containers for each process and run them together with Dredd using `Docker Compose <https://docs.docker.com/compose/overview/>`__. You can `use -\\-abort-on-container-exit and -\\-exit-code-from <https://stackoverflow.com/a/49485880/325365>`__ with Docker Compose to manage the tear down of all the other containers when the Dredd tests finish.


.. _install-npm:

npm
---

Dredd is a command-line application written in JavaScript (to be more precise, in `Node.js <https://nodejs.org>`__) and as such can be installed using `npm <https://www.npmjs.com>`__.


.. _install-nodejs:

Installing Node.js and npm
~~~~~~~~~~~~~~~~~~~~~~~~~~

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
   If your internet connection is restricted (VPN, firewall, proxy), you need to `configure npm <https://docs.npmjs.com/misc/config#https-proxy>`__:

   .. code-block:: text

      npm config set proxy "http://proxy.example.com:8080"
      npm config set https-proxy "https://proxy.example.com:8080"

   Otherwise you'll get similar errors during Dredd installation:

   .. code-block:: text

      npmERR! Cannot read property 'path' of null
      npmERR!code ECONNRESET
      npmERR!network socket hang up

   Later be sure to read :ref:`how to set up Dredd to correctly work with proxies <using-https-proxy>`.


.. _install-dredd:

Installing Dredd
~~~~~~~~~~~~~~~~

Now that you have everything prepared, you can finally run npm to install Dredd:

.. code-block:: text

   npm install dredd --global

.. note::
   If you get ``EACCES`` permissions errors, try `one of the officially recommended solutions <https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally>`__. In the worst case, you can run the command again with ``sudo``.

You can verify Dredd is correctly installed by printing its version number:

.. code-block:: text

   dredd --version

Now you can :ref:`start using Dredd <quickstart>`!


Adding Dredd as a dev dependency
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If your API project is also an npm package, you may want to add Dredd as a dev dependency instead of installing it globally.

- Make sure your project is an npm package with a ``package.json`` file
- In the root of the project run ``npm install dredd --save-dev``
- Once the installation is complete, you can run Dredd from the root of the project as ``npx dredd``

This is how Dredd is installed in the `dredd-example <https://github.com/apiaryio/dredd-example>`__ repository, so you may want to see it for inspiration.
