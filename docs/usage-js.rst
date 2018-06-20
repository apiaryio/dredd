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

Let’s have a look at an example configuration first. (Please also see the :ref:`CLI options <usage-cli>` to read detailed information about the ``options`` attributes).

.. code-block:: javascript

   {
     server: 'http://127.0.0.1:3000/api', // your URL to API endpoint the tests will run against
     options: {

       'path': [],       // Required Array if Strings; filepaths to API description documents, can use glob wildcards

       'dry-run': false, // Boolean, do not run any real HTTP transaction
       'names': false,   // Boolean, Print Transaction names and finish, similar to dry-run

       'level': 'info', // String, log-level (info, silly, debug, verbose, ...)
       'silent': false, // Boolean, Silences all logging output

       'only': [],      // Array of Strings, run only transaction that match these names

       'header': [],    // Array of Strings, these strings are then added as headers (key:value) to every transaction
       'user': null,    // String, Basic Auth credentials in the form username:password

       'hookfiles': [], // Array of Strings, filepaths to files containing hooks (can use glob wildcards)

       'reporter': ['dot', 'html'], // Array of possible reporters, see folder lib/reporters

       'output': [],     // Array of Strings, filepaths to files used for output of file-based reporters

       'inline-errors': false, // Boolean, If failures/errors are display immediately in Dredd run

       'require': null, // String, When using nodejs hooks, require the given module before executing hooks

       'color': true,
       'timestamp': false
     },

     'emitter': EventEmitterInstance, // optional - listen to test progress, your own instance of EventEmitter

     'data': {
       'path/to/file': '...'
     }
   }

Properties
----------

server (string)
~~~~~~~~~~~~~~~

Your choice of the API endpoint to test the API description against. It must be a valid URL (you can specify ``port``, ``path`` and http or https ``protocol``).

options (object)
~~~~~~~~~~~~~~~~

Because ``options.path`` array is required, you must specify options. You’ll end with errors otherwise.

.. _optionspath-object:

options.path (object)
^^^^^^^^^^^^^^^^^^^^^

**Required** Array of filepaths to API description documents. Or it can also be an URL to download the API description from internet via http(s) protocol.

data (object)
^^^^^^^^^^^^^

**Optional** Object with keys as ``filename`` and value as ``blueprint``-code.

Useful when you don’t want to operate on top of filesystem and want to pass code of your API description as a string. You get the point.

.. code-block:: javascript

   {
     'data': {
       './api-description.apib': 'FORMAT: 1A\n\n# My String API\n\nGET /url\n+ Response 200\n\n        Some content',
       './directory/another-api-description.apib': '# Another API\n\n## Group Machines\n\n### Machine [/machine]\n\n#### Read machine [GET]\n\n...'
     }
   }
