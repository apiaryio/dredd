# Transaction object properties

Transaction object is used as a first argument for hook functions

- transaction (object)
  - name: `"Hello, world! > Retrieve Message"` (string) Transaction identification name used for referencing
  - host: `"localhost"` (string) hostname without port
  - port: `3000` (number)
  - protocol: `"https:"` (string)

  - request (object) Request compiled from blueprint
    - body `"Hello world!\n"` (string)
    - headers (object)
    - uri `"/message"` (string)
    - method

  - expected (object) Expected response from blueprint
    - statusCode `"200"` (string)
    - headers (object)
    - body (string)

  - real (object) System under test response data. Present only in `after` hook.
    - statusCode `"200"` (string)
    - headers (object)
    - body (string)

  - origin (object)  Reference to the original bleuprint
    - filename `"./blueprint.md"` (string)
    - apiName `"My Api"` (string)
    - resourceGroupName `"Greetings"` (string)
    - resourceName `"Hello, world!"` (string)
    - actionName `"Retreive Message"` (string)
    - exampleName `"First example"` (string)

  - skip `false` (boolean) Set to `true` to skip this transcition
  - fail `false` (boolean/string) Set to `true` or string with message and transaction will result in fail

  - test (object) Result of [Gavel][] validation, same object is passed to reporters
    - status `"fail"` (string) Test status - phase
    - start `"2015-03-19T00:58:32.796Z"` (string) Start time in [UTC ISO 8601][]
    - valid `false` (boolean) Test result

    - results (object) Results from [Gavel][] in it's format
      - version `"2"` (string) Gavel Validation version
      - statusCode (object) Validation results for status code
      - headers (object) Validation results for headers
      - body (object) Validation results for body

[UTC ISO 8601]: http://wikipedia.org/wiki/ISO_8601
[Gavel]: https://www.relishapp.com/apiary/gavel/docs
