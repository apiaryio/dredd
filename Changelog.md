# Changelog

##0.1

X Sample backend
X Sample blueprints

- Javascript API integration test
  
  Create Runtime(configuration)
    - if blueprint path exits
  
    - parse url
      - if hostname not found
  - if bleuprint not found

- Parse blueprint
  - Mock parameters
  - Try to interpolate uri and query parameters

- Identify ambigous transactions (steps)
  - Warn if ambigous transactions

- It returns exit code 1 if any error
- It returns exit code 0 if no error

- Statistics: 
  Steps:
    - Total steps
    - Steps passed
    - Steps failed
    - Steps skipped

- It should exit 2 and return to stderr if no blueprint or
  host given
- It should parse the blueprint


- AST
  - Scenarios
    - Backround
    - Steps
      - Test case
        - Dredd Test Result
        - Gavel Data

- Progress:
Testing host: http://localhost:3000

.....F...

1)
POST /machines [FAIL]
  Request:
    Method: GET
    URI: /
  Response:
    Body:
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


Next version:
 Scenarios
 DRY Backgrounds

Output
  Scenarios:
    - Total scenarios
    - Scenarios passed
    - Scenarios failed
    - Scenarios skipped
- Ascii / Color output for all validators
