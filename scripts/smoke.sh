#!/bin/bash
# Performs a smoke test verifying the package produced by the build
# is installable and that Dredd's core life functions are okay


# Aborts as soon as anything returns non-zero exit status
set -e


if [ ! -z "$TRAVIS" ]; then
  # Move everything in the current directory to a subdirectory called 'dredd'
  #
  # First we set glob to make the line with 'mv' to take dotfiles as well.
  # Then we rely on the fact 'mv' errors on moving the new './dredd' directory
  # to itself, but it still does move the rest, so all we need is to ignore
  # the error.
  mkdir ./dredd
  shopt -s dotglob
  mv * ./dredd 2> /dev/null || true

  # Prepare the Dredd package as a tarball
  cd ./dredd
  npm install --no-optional --no-save
  npm pack
  cd ..

  # Get an instance of the 'dredd-example' repo
  git clone https://github.com/apiaryio/dredd-example.git
  cd ./dredd-example
  npm install --no-optional --no-save

  # Use the tarball, run the 'dredd-example' project tests
  npm install ../dredd/*.tgz --no-optional --save-dev
  npm test
fi
