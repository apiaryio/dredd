#!/bin/sh
# Runs tests and collects code coverage to ./cov.info file

set -e # aborts as soon as anything returns non-zero exit status


PROJECT_DIR=$(pwd -P)

COVERAGE_FILE="$PROJECT_DIR"/cov.info
COVERAGE_DIR="$PROJECT_DIR"/lcov
INSTRUMENTED_CODE_DIR="$PROJECT_DIR"/src-cov
BIN_DIR="$PROJECT_DIR"/node_modules/.bin


# Cleanup & preparation
rm -rf "$INSTRUMENTED_CODE_DIR" "$COVERAGE_DIR" "$COVERAGE_FILE"
mkdir "$INSTRUMENTED_CODE_DIR" "$COVERAGE_DIR"


# Creating directory with instrumented JS code
"$BIN_DIR"/coffeeCoverage \
    --exclude=node_modules,.git,test,scripts \
    --path=relative \
    "$PROJECT_DIR" "$INSTRUMENTED_CODE_DIR" 1>&2

cp "$PROJECT_DIR"/package.json "$INSTRUMENTED_CODE_DIR"

cp -r "$PROJECT_DIR"/bin "$INSTRUMENTED_CODE_DIR"/bin
chmod +x "$INSTRUMENTED_CODE_DIR"/bin/*

cp -r "$PROJECT_DIR"/scripts "$INSTRUMENTED_CODE_DIR"/scripts
cp -r "$PROJECT_DIR"/docs "$INSTRUMENTED_CODE_DIR"/docs
cp -r "$PROJECT_DIR"/test "$INSTRUMENTED_CODE_DIR"/test

mkdir -p "$INSTRUMENTED_CODE_DIR"/node_modules/.bin
ln -s "$BIN_DIR"/* "$INSTRUMENTED_CODE_DIR"/node_modules/.bin


# Testing
export COVERAGE_DIR
cd "$INSTRUMENTED_CODE_DIR" && npm test
cd ..


# Merging LCOV reports
"$BIN_DIR"/lcov-result-merger "$COVERAGE_DIR/*.info" "$COVERAGE_FILE"
echo "Coverage saved as '$COVERAGE_FILE'"


# Output & cleanup
rm -rf "$INSTRUMENTED_CODE_DIR" "$COVERAGE_DIR"
