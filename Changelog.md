# Changelog

## TODO

##0.0.1
- allways passing test skeleton as package
- test application in Travis-CI

##0.1

- Sample backend
- Sample blueprints
- Cli integration test
- Parse blueprint
- Fill AST
- Try to interpolate uri and query parameters
- Identify ambigous transaction

- Warn if ambigous transaction
- It returns exit code 1 if any error
- It returns exit code 0 if no error
- Statistics: 
  Scenarios:
    - Total scenarios
    - Scenarios passed
    - Scenarios failed
    - Scenarios skipped
  Steps:
    - Total steps
    - Steps passed
    - Steps failed
    - Steps skipped

- It should parse the blueprint

- AST
  - Scenarios
    - Backround
    - Steps
      - Test case
        - Dredd Test Result
        - Gavel Data


what next:
 Scenarios
 DRY Backgrounds


## 0.2
- Ascii / Color output for all validators
--skip Do not halt on Failure

--format/reporter

- Progress:
 .....F...

1)
POST /machines [FAIL]
  Body
    Error: Missing id key.
    {
      "kind": "bulldozer",
      "name": "willy"
    }

  Status code
    Error: Status code does not match.
    201
    200

- Pretty:
GET /machine_types/{id} [SKIP]
  Warning: Ambigous transaction, skipping test.

POST /machines [FAIL]
  Body
    Error: Missing id key.
    {
      "kind": "bulldozer",
      "name": "willy"
    }

  Status code
    Error: Status code does not match.
    301
    200

GET /machines/1 [FAIL]
  Headers
    Error: Missing header 'content-type'.

PUT /machines/1 [OK]

DELETE /machines/1 [FAIL]
  Status code:
    Error: Status code doues not match.
    204
    200
