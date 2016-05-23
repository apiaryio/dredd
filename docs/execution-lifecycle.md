# Execution Lifecycle

This section provides the order in which Dredd executes to give a better understanding of how Dredd works.

1. Load and parse API description documents
    - Report parsing warnings
2. Pre-run API description check
    - Missing example values for URI template parameters
    - Required parameters present in URI
    - Report non-parseable JSON bodies
    - Report invalid URI parameters
    - Report Invalid URI templates
3. Compile HTTP transactions from API description documents
    - Inherit headers
    - Inherit parameters
    - Expand URI templates with parameters
4. Load hooks
5. Test run
    - Report test run `start`
    - Run `beforeAll` hooks
    - For each compiled transaction:
        - Report `test start`
        - Run `beforeEach` hook
        - Run `before` hook
        - Send HTTP request
        - Receive HTTP response
        - Run `beforeEachValidation` hook
        - Run `beforeValidation` hook
        - Perform [Gavel][] validation
        - Run `after` hook
        - Run `afterEach` hook
        - Report `test end` with result for in-progress reporting
    - Run `afterAll` hooks
6. Report test run `end` with result statistics

[Gavel]: http://blog.apiary.io/2013/07/24/Bam-this-is-Gavel/
