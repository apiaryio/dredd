.. _usage-cli:

Command-line Interface
======================

Usage
-----

::

   $ dredd '<api-description-document>' '<api-location>' [OPTIONS]

Example:

::

   $ dredd ./apiary.md http://127.0.0.1:3000

Arguments
---------

.. _api-description-document-string:

.. option:: api-description-document

   URL or path to the API description document (API Blueprint, OpenAPI 2).
   **Sample values:** ``./api-blueprint.apib``, ``./openapi2.yml``, ``./openapi2.json``, ``http://example.com/api-blueprint.apib``

.. _api-location-string:

.. option:: api-location

   URL, the root address of your API.
   **Sample values:** ``http://127.0.0.1:3000``, ``http://api.example.com``

Configuration File
------------------

If you use Dredd repeatedly within a single project, the preferred way to run it is to first persist your configuration in a ``dredd.yml`` file. With the file in place you can then run Dredd every time simply just by:

::

   $ dredd

Dredd offers interactive wizard to setup your ``dredd.yml`` file:

::

   $ dredd init

See below how sample configuration file could look like. The structure is the same as of the :ref:`Dredd Class configuration object <configuration-object-for-dredd-class>`.

.. code-block:: openapi2

   reporter: apiary
   custom:
     - "apiaryApiKey:yourSecretApiaryAPiKey"
     - "apiaryApiName:apiName"
   dry-run: null
   hookfiles: "dreddhooks.js"
   server: rails server
   server-wait: 3
   init: false
   names: false
   only: []
   output: []
   header: []
   sorted: false
   user: null
   inline-errors: false
   details: false
   method: []
   level: info
   timestamp: false
   silent: false
   path: []
   blueprint: api-description.apib
   endpoint: "http://127.0.0.1:3000"

.. note::
   Do not get confused by Dredd using a keyword ``blueprint`` also for paths to OpenAPI 2 documents. This is for historical reasons and will be changed in the future.

CLI Options Reference
---------------------

Remember you can always list all available arguments by ``dredd --help``.

.. cli-options:: ../lib/options.json
