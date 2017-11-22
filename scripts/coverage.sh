#!/bin/sh
# Runs tests and collects code coverage to ./lcov.info file

set -e # aborts as soon as anything returns non-zero exit status


PROJECT_DIR=$(pwd -P)

COVERRAGE_DIR="$PROJECT_DIR"/coverage
COVERAGE_FILE="$PROJECT_DIR"/coverage/lcov.info
BIN_DIR="$PROJECT_DIR"/node_modules/.bin
TEST_GLOB=dist/test/**/*-test.coffee


# Cleanup & preparation
rm -rf "$COVERRAGE_DIR"
rm -rf dist
npm run copy:test
npm run build


# Testing
export COVERAGE_FILE
istanbul cover ./node_modules/.bin/mocha -- \
    "$TEST_GLOB" \
    --compilers=coffee:coffee-script/register \
    --recursive
cd ..
echo "Coverage saved as '$COVERAGE_FILE'"
