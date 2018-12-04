#!/bin/bash
# Validates format of the commit messages on Travis CI


set -e  # aborts as soon as anything returns non-zero exit status


if [ ! -z "$TRAVIS" ]; then
  git remote set-branches origin master
  git fetch --unshallow --quiet
  git checkout master --quiet
  git checkout - --quiet
  ./node_modules/.bin/commitlint-travis
else
  ./node_modules/.bin/commitlint --from=master
fi
