#!/bin/bash
# Validates format of the commit messages on CI


set -e  # aborts as soon as anything returns non-zero exit status

if [ ! -z "$CIRCLECI" ]; then
  ./node_modules/.bin/commitlint-circle
else
  ./node_modules/.bin/commitlint --from=master
fi
