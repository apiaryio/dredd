.. _hooks-new-language:

Writing Dredd hook handler for new language
===========================================

Dredd hooks handler client
--------------------------

Dredd comes with concept of hooks language abstraction bridge via simple TCP socket.

When you run Dredd with :option:`--language` option, it runs the given command and tries to connect to ``http://127.0.0.1:61321``. If connection to the hook handling server wasn’t successful, it exits with exit code ``3``.

Dredd internally registers a function for each :ref:`type of hooks <types-of-hooks>` and when this function is executed it assigns execution ``uuid`` to that event, serializes received function parameters (a :ref:`Transaction object <transaction>` or an Array of it), sends it to the TCP socket to be handled (executed) in other language and waits until message with same ``uuid`` is received. After data reception it assigns received ``data`` back to the transaction, so other language can interact with transactions same way like :ref:`native Node.js hooks <hooks-nodejs>`.

Language agnostic test suite
----------------------------

Dredd hooks language abstraction bridge comes with `the language agnostic test suite <https://github.com/apiaryio/dredd-hooks-template>`__. It’s written in Gherkin - language for writing `Cucumber <https://github.com/cucumber/cucumber/wiki/A-Table-Of-Content>`__ scenarios and `Aruba CLI testing framework <https://github.com/cucumber/aruba>`__ and it tests your new language handler integration with CLI Dredd and expected behavior from user’s perspective.

What to implement
-----------------

If you want to write a hook handler for your language you will have to implement:

-  CLI Command runnning TCP socket server

   -  `Must return message ``Starting`` to stdout <https://github.com/apiaryio/dredd-hooks-template/blob/master/features/tcp_server.feature#L5>`__

-  Hooks API in your language for registering code being executed during the :ref:`Dredd lifecycle <execution-life-cycle>`:

   -  before all transactions
   -  before each transaction
   -  before transaction
   -  before each transaction validation
   -  before transaction validation
   -  after transaction
   -  after each transaction
   -  after all transactions

-  When CLI command is executed

   -  It loads files passed in alphabetical order with paths resolved to absolute form

      -  It exposes API similar to those in :ref:`Ruby <hooks-ruby>`, :ref:`Python <hooks-python>` and :ref:`Node.js <hooks-nodejs>` to each loaded file
      -  It registers functions declared in files for later execution

   -  starts a TCP socket server and starts listening on ``http://127.0.0.1:61321``.

-  When any data is received by the server

   -  Adds every received character to a buffer
   -  When delimiting newline (``\n``) character is received

      -  It parses the :ref:`message <tcp-socket-message-format>` in the buffer as JSON
      -  It looks for ``event`` key in received object and executes appropriate registered hooks functions

   -  When the hook function is being executed

      -  It passes value of ``data`` key from received object to the executed function
      -  Hook function is able to modify data

   -  When function was executed

      -  It should serialize message to JSON
      -  Send the serialized message back to the socket with same ``uuid`` as received
      -  Send a newline character as message delimiter

Termination
-----------

When the testing is done, Dredd signals the hook handler process to terminate. This is done repeatedly with delays. When termination timeout is over, Dredd loses its patience and kills the process forcefully.

-  **retry delays** can be configured by :option:`--hooks-worker-term-retry`
-  **timeout** can be configured by :option:`--hooks-worker-term-timeout`

On Linux or macOS, Dredd uses the ``SIGTERM`` signal to tell the hook handler process it should terminate. On Windows, where signals do not exist, Dredd sends the ``END OF TEXT`` character (``\u0003``, which is ASCII representation of Ctrl+C) to standard input of the process.

.. _tcp-socket-message-format:

TCP Socket Message format
-------------------------

-  transaction (object)

   -  uuid: ``234567-asdfghjkl`` (string) - Id used for event unique identification on both server and client sides
   -  event: ``event`` (enum) - Event type

      -  beforeAll (string) - Signals the hook handler to run the ``beforeAll`` hooks
      -  beforeEach (string) - Signals the hook handler to run the ``beforeEach`` and ``before`` hooks
      -  beforeEachValidation (string) - Signals the hook handler to run the ``beforeEachValidation`` and ``beforeValidation`` hooks
      -  afterEach (string) - Signals the hook handler to run the ``after`` and ``afterEach`` hooks
      -  afterAll (string) - Signals the hook handler to run the ``afterAll`` hooks

   -  data (enum) - Data passed as a argument to the function

      -  (object) - Single Transaction object
      -  (array) - An array of Transaction objects, containing all transactions in the API description. Sent for ``beforeAll`` and ``afterAll`` events

Configuration Options
---------------------

There are several configuration options, which can help you during development:

-  :option:`--hooks-worker-timeout`
-  :option:`--hooks-worker-connect-timeout`
-  :option:`--hooks-worker-connect-retry`
-  :option:`--hooks-worker-after-connect-wait`
-  :option:`--hooks-worker-term-timeout`
-  :option:`--hooks-worker-term-retry`
-  :option:`--hooks-worker-handler-host`
-  :option:`--hooks-worker-handler-port`

Need help? No problem!
----------------------

If you have any questions, please:

-  Have a look at the `Ruby <https://github.com/apiaryio/dredd-hooks-ruby>`__, `Python <https://github.com/apiaryio/dredd-hooks-python>`__, `Perl <https://github.com/ungrim97/Dredd-Hooks>`__, and `PHP <https://github.com/ddelnano/dredd-hooks-php>`__ hook handlers codebase for inspiration
-  If you’re writing a hook handler for a compiled language, check out the `Go <https://github.com/snikch/goodman>`__ implementation
-  File an `issue in Dredd repository <https://github.com/apiaryio/dredd/issues/new>`__
