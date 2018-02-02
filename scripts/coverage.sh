#!/bin/sh
# Runs tests and collects code coverage to ./coverage/lcov.info file

set -e # Aborts as soon as anything returns non-zero exit status


PROJECT_DIR=$(pwd -P)

COVERAGE_FILE="$PROJECT_DIR"/coverage/lcov.info
COVERAGE_DIR="$PROJECT_DIR"/coverage
BIN_DIR="$PROJECT_DIR"/node_modules/.bin


# Cleanup & preparation
rm -rf "$COVERAGE_DIR" "$COVERAGE_FILE"
mkdir "$COVERAGE_DIR"
chmod +x "$PROJECT_DIR"/bin/dredd


export COVERAGE_DIR


# Testing & coverage
# Add missing coverage for ./bin/dredd https://github.com/apiaryio/dredd/issues/958
istanbul cover ./node_modules/.bin/_mocha -- \
  "test/**/*-test.js" \
  --reporter=test/reporter.js \
  --recursive


# Merging LCOV reports
"$BIN_DIR"/lcov-result-merger "$COVERAGE_DIR/*.info" "$COVERAGE_FILE"
echo "Coverage saved as '$COVERAGE_FILE'"
