.. _installation:

Installation
============

Dredd is a command-line application written in JavaScript. To run it on your machine or in your :ref:`Continuous Integration server <continuous-integration>`, you first need to have `Node.js <https://nodejs.org/en/>`__ installed.

.. _install-nodejs:

Install Node.js
---------------

macOS
~~~~~

1. Install Node.js.

   -  If you’re using `Homebrew <https://brew.sh/>`__, run ``brew install node``.
   -  Otherwise `download Node.js <https://nodejs.org/en/download/>`__ from the official website and install Node.js using the downloaded installer.

2. Make sure both ``node --version`` and ``npm --version`` work in your Terminal.

Windows
~~~~~~~

1. `Download Node.js <https://nodejs.org/en/download/>`__ from the official website and install Node.js using the downloaded installer.
2. Make sure both ``node --version`` and ``npm --version`` work in your Command Prompt.

Linux
~~~~~

1. `Install Node.js as system package <https://nodejs.org/en/download/package-manager/>`__.
2. Make sure both ``node --version`` and ``npm --version`` work in your Terminal.

Pro Tips
~~~~~~~~

-  :ref:`Continuous Integration section in the How-To Guides <continuous-integration>` can help you to install Dredd on CI server.
-  To maintain multiple Node.js versions on your computer, check out `nvm <https://github.com/creationix/nvm>`__.

Install Dredd
-------------

1. ``npm install -g dredd``
2. ``dredd --version``

If the second command works, you’re done!

Globally vs locally
~~~~~~~~~~~~~~~~~~~

The ``-g`` ensures Dredd will be installed “globally”. That means you’ll be able to access it from any directory just by typing ``dredd``.

If you work on projects installable by ``npm``, i.e. projects containing ``package.json``, you might want to have Dredd installed as a development dependency instead. Just install Dredd by ``npm install dredd --save-dev``. See ``package.json`` of the `Dredd Example <https://github.com/apiaryio/dredd-example/>`__ repository for inspiration.

Which Version?
~~~~~~~~~~~~~~

-  **For development**, always go with the latest version.
-  **For testing in CI** (:ref:`what’s CI? <continuous-integration>`), always pin your Dredd version to a specific number and upgrade to newer releases manually (but often!).

Why Am I Seeing Network Errors?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

In a restricted network (VPN, firewall, proxy) you can see errors similar to the following ones:

.. code-block:: text

   npmERR! Cannot read property 'path' of null
   npmERR!code ECONNRESET
   npmERR!network socket hang up

.. code-block:: text

   Error: Command failed: git config --get remote.origin.url
   ssh: connect to host github.com port 22: Operation timed out
   fatal: Could not read from remote repository.

To solve these issues, you need to set your proxy settings for both ``npm`` and ``git``:

.. code-block:: shell

   $ npm config set proxy "http://proxy.company.com:8080"
   $ npm config set https-proxy "https://proxy.company.com:8080"

   $ git config --global http.proxy "http://proxy.company.com:8080"
   $ git config --global https.proxy "https://proxy.company.com:8080"

When using ``git config``, make sure you have the port specified even when it’s the standard ``:80``. Also check out :ref:`how to set up Dredd to correctly work with proxies <using-https-proxy>`.

Why I’m Seeing ``node-gyp`` or ``python`` Errors?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The installation process features compilation of some C++ components, which may not be successful. In that case, errors related to ``node-gyp`` or ``python`` are printed. However, if ``dredd --version`` works for you when the installation is done, feel free to ignore the errors.

In case of compilation errors, Dredd automatically uses a less performant solution written in pure JavaScript. Next time when installing Dredd, you can use ``npm install -g dredd --no-optional`` to skip the compilation step (:ref:`learn more about this <compiled-vs-pure-javascript>`).

Why Is the Installation So Slow?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The installation process features compilation of some C++ components, which may take some time (:ref:`learn more about this <compiled-vs-pure-javascript>`). You can simplify and speed up the process using ``npm install -g dredd --no-optional`` if you are:

-  using Dredd exclusively with `Swagger <https://swagger.io/>`__,
-  using Dredd with small `API Blueprint <https://apiblueprint.org/>`__ files,
-  using Dredd on Windows or other environments with complicated C++11 compiler setup.

The ``--no-optional`` option avoids any compilation attempts when installing Dredd, but causes slower reading of the API Blueprint files, especially the large ones.
