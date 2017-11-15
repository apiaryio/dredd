#!/bin/sh
# Picks up the ./lcov.info file and sends the coverage to coveralls.io


# Input validation
if [ ! -f ./lcov.info ]; then
    (>&2 echo "Coverage file 'lcov.info' was not found.")
    (>&2 echo "First run the test suite as 'npm run test:coverage'.")
    exit 1
fi


# Coveralls
cat ./lcov.info | ./node_modules/.bin/coveralls
