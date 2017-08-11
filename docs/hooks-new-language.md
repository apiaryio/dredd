# Writing Dredd hook handler for new language

## Dredd hooks handler client

Dredd comes with concept of hooks language abstraction bridge via simple TCP socket.

When you run Dredd with `--language` argument, it runs the command in argument and tries to connect to `http://127.0.0.1:61321`. If connection to the hook handling server wasn't successful, it exits with exit code `3`.

Dredd internally registers a function for each [type of hooks](hooks.md#types-of-hooks) and when this function is executed it assigns execution `uuid` to that event, serializes received function parameters (a [Transaction object](data-structures.md#transaction) or an Array of it), sends it to the TCP socket to be handled (executed) in other language and waits until message with same `uuid` is received. After data reception it assigns received `data` back to the transaction, so other language can interact with transactions same way like [native Node.js hooks](hooks-nodejs.md).

## Language agnostic test suite

Dredd hooks language abstraction bridge comes with [the language agnostic test suite](https://github.com/apiaryio/dredd-hooks-template). It's written in Gherkin - language for writing [Cucumber](https://github.com/cucumber/cucumber/wiki/A-Table-Of-Content) scenarios and [Aruba CLI testing framework](https://github.com/cucumber/aruba) and it tests your new language handler integration with CLI Dredd and expected behavior from user's perspective.

## What to implement

If you want to write a hook handler for your language you will have to implement:

- CLI Command runnning TCP socket server
    - [Must return message `Starting` to stdout](https://github.com/apiaryio/dredd-hooks-template/blob/master/features/tcp_server.feature#L5)
- Hooks API in your language for registering code being executed during the [Dredd lifecycle](how-it-works.md#execution-life-cycle):
    - before all transactions
    - before each transaction
    - before transaction
    - before each transaction validation
    - before transaction validation
    - after transaction
    - after each transaction
    - after all transactions
- When CLI command is executed
    - It loads files passed in alphabetical order with paths resolved to absolute form
        - It exposes API similar to those in [Ruby](hooks-ruby.md), [Python](hooks-python.md) and [Node.js](hooks-nodejs.md) to each loaded file
        - It registers functions declared in files for later execution
    - starts a TCP socket server and starts listening on `http://127.0.0.1:61321`.
- When any data is received by the server
    - Adds every received character to a buffer
    - When delimiting newline (`\n`) character is received
        - It parses the [message](#tcp-socket-message-format) in the buffer as JSON
        - It looks for `event` key in received object and executes appropriate registered hooks functions
    - When the hook function is being executed
        - It passes value of `data` key from received object to the executed function
        - Hook function is able to modify data
    - When function was executed
        - It should serialize message to JSON
        - Send the serialized message back to the socket with same `uuid` as received
        - Send a newline character as message delimiter

## Termination

When the testing is done, Dredd signals the hook handler process to terminate. This is done repeatedly with delays. When termination timeout is over, Dredd loses its patience and kills the process forcefully.

- **retry delays** can be configured by [`--hooks-worker-term-retry`](usage-cli.md#hooks-worker-term-retry)
- **timeout** can be configured by [`--hooks-worker-term-timeout`](usage-cli.md#hooks-worker-term-timeout)

On Linux or macOS, Dredd uses the `SIGTERM` signal to tell the hook handler process it should terminate. On Windows, where signals do not exist, Dredd sends the `END OF TEXT` character (`\u0003`, which is ASCII representation of <kbd>Ctrl+C</kbd>) to standard input of the process.

## TCP Socket Message format

- transaction (object)
    - uuid: `234567-asdfghjkl` (string) - Id used for event unique identification on both server and client sides
    - event: `event` (enum) - Event type
        - beforeAll (string) - Signals the hook handler to run the `beforeAll` hooks
        - beforeEach (string) - Signals the hook handler to run the `beforeEach` and `before` hooks
        - beforeEachValidation (string) - Signals the hook handler to run the `beforeEachValidation` and `beforeValidation` hooks
        - afterEach (string) - Signals the hook handler to run the `after` and `afterEach` hooks
        - afterAll (string) - Signals the hook handler to run the `afterAll` hooks
    - data (enum) - Data passed as a argument to the function
        - (object) - Single Transaction object
        - (array) - An array of Transaction objects, containing all transactions in the API description. Sent for `beforeAll` and `afterAll` events

## Configuration Options

There are several configuration options, which can help you during development:

- `--hooks-worker-timeout` - [docs](usage-cli.md#hooks-worker-timeout)
- `--hooks-worker-connect-timeout` - [docs](usage-cli.md#hooks-worker-connect-timeout)
- `--hooks-worker-connect-retry` - [docs](usage-cli.md#hooks-worker-connect-retry)
- `--hooks-worker-after-connect-wait` - [docs](usage-cli.md#hooks-worker-after-connect-wait)
- `--hooks-worker-term-timeout` - [docs](usage-cli.md#hooks-worker-term-timeout)
- `--hooks-worker-term-retry` - [docs](usage-cli.md#hooks-worker-term-retry)
- `--hooks-worker-handler-host` - [docs](usage-cli.md#hooks-worker-handler-host)
- `--hooks-worker-handler-port` - [docs](usage-cli.md#hooks-worker-handler-port)

## Need help? No problem!

If you have any questions, please:

- Have a look at the [Ruby](https://github.com/apiaryio/dredd-hooks-ruby), [Python](https://github.com/apiaryio/dredd-hooks-python), [Perl](https://github.com/ungrim97/Dredd-Hooks), and [PHP](https://github.com/ddelnano/dredd-hooks-php) hook handlers codebase for inspiration
- If you’re writing a hook handler for a compiled language, check out the [Go](https://github.com/snikch/goodman) implementation
- File an [issue in Dredd repository](https://github.com/apiaryio/dredd/issues/new)
