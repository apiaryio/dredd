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
  npm install --no-save
  npm pack
  cd ..

  # Get an instance of the 'dredd-example' repo
  git clone https://github.com/apiaryio/dredd-example.git
  cd ./dredd-example
  npm install --no-save

  # Use the tarball version of Dredd in the 'dredd-example' project
  #
  # The line below prints the output of the npm install command and captures
  # it for later introspection at the same time.
  { output=$(npm install ../dredd/*.tgz --save-dev | tee /dev/fd/5); } 5>&1

  # Assert that Protagonist (the C++ dependency) was not installed
  if [[ $output == *"protagonist"* || -d ./node_modules/protagonist ]]; then
    echo "ERROR: It looks like Dredd has tried to install the 'protagonist'"\
      "library (a C++ binding for the API Blueprint parser), which is"\
      "an unwanted behavior of the installation process. The lock file"\
      "of the 'dredd-transactions' library together with its"\
      "'scripts/postshrinkwrap.js' script should have prevented this."
    exit 1
  fi

  # Test the 'dredd-example' project
  npm test

  # Test the JavaScript API
  node -e 'process.exitCode = (new (require("dredd"))({})).run ? 0 : 1;'
fi
