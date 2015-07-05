# Writing Dredd hook handler for new language

## Dredd hooks handler client

Dredd comes with concept of hooks language abstraction bridge via simple TCP socket.

When you run Dredd with `--langauge` argument, it runs the command in argument and tries to connect to localhost port `61321`. If cannection to the hook handling serevr was'nt sucecssful it exits with `3`.

Dredd internally registers a function for each [type of hooks](hooks.md#types-of-hooks) and when this function is executed it generates execution `uuid`, serializes received function parameters, sends it to the socket for handling (execution) in other language and waits until messaage with same `uuid` is received. Then it assigns received data back to the transaction, so other language can interact with transactions same way like [native Node.js hooks](hooks-node.md).

## What to implement

- CLI Command with TCP socket server
- Hooks API in your language for registering code being executed during the [Dredd lifecycle](usage.md#dredd-execution-lifecycle):
  - before all transactions
  - before each transaction
  - before transaction
  - before each transaction validation
  - before transaction validation
  - after transaction
  - after each transaction
  - after all transactions


- When CLI command is executed
  - it loades files specified as CLI server arguments
    - it exposes API similar to theese in [Ruby](hooks-ruby.md), [Python](hooks-python.md) and [Node.js](hooks-node.md) to each loaded file
    - it registers functions declared in files for later execution

  - starts a TCP socket server and starts listeneing on localhost port `61321`.

- When any data is recieved by the server
  - Adds every received character to a buffer

  - When delimiting newline (`"\n"`) character is received
    - It parses the [message](#tcp-socket-message-format) in the buffer as JSON
    - It looks for `event` key in received object and executes appropriate registered hooks functions

    - When the hook function is executed
      - It passes value of `data` key from received object to the executed function
      - Hook function is able to modify data

    - When function was executed
      - It should serialize message to JSON
      - Send the serialized message back to the socket with same `uuid` as received
      - Send a newliene character as message delimiter

## TCP Socket Message format

- transaction (object)
    - uuid: `234567-asdfghjkl` (string) Id used for event unique identification on both server and client sides

    - event: `event` (enum) Event type
      - beforeAll (string)
      - beforeEach (string)
      - before (string)
      - beforeEachValidation (string)
      - beforeValidation (string)
      - after (string)
      - afterEach (string)
      - afterAll (string)

    - data: (object, array) Data passed as a argument to the function


## Language agnostic test suite

Dredd hooks language abstraction bridge comes with [the language agnostic test suite](https://github.com/apiaryio/dredd-hooks-template). It's written in Gherkin - language for writing [Cucumber](https://github.com/cucumber/cucumber/wiki/A-Table-Of-Content) scenarios and [Aruba CLI testing framework](https://github.com/cucumber/aruba) and it tests your new language handelr integration with CLI Dredd and expected behavior from user's perspective.