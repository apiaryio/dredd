#!/bin/bash
# Installs the package and checks whether the C++ dependency is being installed


# Aborts as soon as anything returns non-zero exit status
set -e


if [ ! -z "$TRAVIS" ]; then
  # The line below prints the output of the npm install command and captures
  # it for later introspection at the same time.
  { output=$(npm install . --no-save | tee /dev/fd/5); } 5>&1

  # Assert that Protagonist (the C++ dependency) was not installed
  if [[ $output == *"protagonist"* || -d ./node_modules/protagonist ]]; then
    echo "ERROR: It looks like Dredd Transactions has tried to install "
      "the 'protagonist' library (a C++ binding for the API Blueprint"\
      "parser), which is an unwanted behavior of the installation process."\
      "The lock file together with the 'scripts/postshrinkwrap.js' script"\
      "should have prevented this."
    exit 1
  fi
fi
