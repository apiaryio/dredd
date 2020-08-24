#!/bin/bash
# Validates format of the commit messages on CI


set -e  # aborts as soon as anything returns non-zero exit status

npx commitlint --from=master
