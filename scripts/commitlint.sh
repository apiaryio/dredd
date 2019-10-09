#!/bin/bash
# Validates format of the commit messages on CI


set -e  # aborts as soon as anything returns non-zero exit status

if [ ! -z "$CIRCLECI" ]; then
  npx commitlint-circle
else
  npx commitlint --from=master
fi
