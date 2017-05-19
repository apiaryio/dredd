#!/bin/sh
# Runs tests and collects code coverage to ./cov.info file

set -e # aborts as soon as anything returns non-zero exit status


PROJECT_DIR=$(pwd -P)

COVERAGE_FILE="$PROJECT_DIR"/cov.info
INSTRUMENTED_CODE_DIR="$PROJECT_DIR"/src-cov
BIN_DIR="$PROJECT_DIR"/node_modules/.bin


# Cleanup & preparation
rm -rf "$INSTRUMENTED_CODE_DIR" "$COVERAGE_FILE"
mkdir "$INSTRUMENTED_CODE_DIR"


# Creating directory with instrumented JS code
"$BIN_DIR"/coffeeCoverage \
    --exclude=node_modules,.git,test,scripts \
    --path=relative \
    "$PROJECT_DIR" "$INSTRUMENTED_CODE_DIR" 1>&2

cp "$PROJECT_DIR"/package.json "$INSTRUMENTED_CODE_DIR"
cp -r "$PROJECT_DIR"/test "$INSTRUMENTED_CODE_DIR"/test


# Testing
export COVERAGE_FILE
cd "$INSTRUMENTED_CODE_DIR" && npm test
cd ..
echo "Coverage saved as '$COVERAGE_FILE'"


# Output & cleanup
rm -rf "$INSTRUMENTED_CODE_DIR"
