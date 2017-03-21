#!/bin/sh
# Picks up the ./cov.info file and sends the coverage to coveralls.io


# Input validation
if [ ! -f ./cov.info ]; then
    (>&2 echo "Coverage file 'cov.info' was not found.")
    (>&2 echo "First run the test suite as 'npm run test:coverage'.")
    exit 1
fi


# Coveralls
cat ./cov.info | ./node_modules/.bin/coveralls
