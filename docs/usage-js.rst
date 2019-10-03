.. _usage-js:

Using Dredd as a JavaScript Library
===================================

Dredd can be used directly from your JavaScript code. First, import and configure Dredd:

.. code-block:: javascript

   var Dredd = require('dredd');
   var dredd = new Dredd(configuration);

Then you need to run the Dredd testing:

.. code-block:: javascript

   dredd.run(function (err, stats) {
     // err is present if anything went wrong
     // otherwise stats is an object with useful statistics
   });

As you can see, ``dredd.run`` is a function receiving another function as a callback. Received arguments are ``err`` (error if any) and ``stats`` (testing statistics) with numbers accumulated throughout the Dredd run.

.. _configuration-object-for-dredd-class:

Configuration Object for Dredd Class
------------------------------------

Let’s have a look at an example configuration first. (Please also see the :ref:`CLI options <usage-cli>` to read detailed information about the list of available options).

.. code-block:: javascript

   {
     endpoint: 'http://127.0.0.1:3000/api', // your URL to API endpoint the tests will run against
     path: [],         // Required Array if Strings; filepaths to API description documents, can use glob wildcards
     'dry-run': false, // Boolean, do not run any real HTTP transaction
     names: false,     // Boolean, Print Transaction names and finish, similar to dry-run
     loglevel: 'warning', // String, logging level (debug, warning, error, silent)
     only: [],         // Array of Strings, run only transaction that match these names
     header: [],       // Array of Strings, these strings are then added as headers (key:value) to every transaction
     user: null,       // String, Basic Auth credentials in the form username:password
     hookfiles: [],    // Array of Strings, filepaths to files containing hooks (can use glob wildcards)
     reporter: ['dot', 'html'], // Array of possible reporters, see folder lib/reporters
     output: [],       // Array of Strings, filepaths to files used for output of file-based reporters
     'inline-errors': false, // Boolean, If failures/errors are display immediately in Dredd run
     require: null,    // String, When using nodejs hooks, require the given module before executing hooks
     color: true,
     emitter: new EventEmitter(), // listen to test progress, your own instance of EventEmitter
     apiDescriptions: ['FORMAT: 1A\n# Sample API\n']
   }

.. warning::
   The usage of nested ``options`` key is deprecated. Please list options under the root of the configuration. 

.. warning::
   The top-level `server` property must be replaced by ``endpoint``. Do not confuse with the options `--server` option, that provides a server running command (i.e. ``npm start``).

.. js:data:: configuration

.. js:attribute:: configuration.endpoint

   The HTTP(S) address of the API server to test against the API description(s). A valid URL is expected, e.g. ``http://127.0.0.1:8000``

   :type: string
   :required: yes

.. js:attribute:: configuration.path

   Array of paths or URLs to API description documents.

   :type: array
   :required: yes

.. js:attribute:: configuration.emitter

   Listen to test progress by providing your own instance of `EventEmitter <https://nodejs.org/api/events.html#events_class_eventemitter>`__.

   :type: EventEmitter

.. js:attribute:: configuration.apiDescriptions

   API descriptions as strings. Useful when you don't want to operate on top of the filesystem.

   :type: array
