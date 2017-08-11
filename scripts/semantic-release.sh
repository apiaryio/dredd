#!/bin/sh
# Publishes new Dredd release to npm registry


SEMANTIC_RELEASE=./node_modules/.bin/semantic-release


add_stable_dist_tag() {
  PACKAGE_NAME=$(coffee -e 'console.log(require("./package.json").name)')
  PACKAGE_VERSION=$(coffee -e 'console.log(require("./package.json").version)')

  npm dist-tag add "$PACKAGE_NAME@$PACKAGE_VERSION" stable
  return $?
}


# Semantic Release has built-in workaround for waiting until all parallel
# builds finish on Travis CI. However, Travis CI introduced "build stages"
# to tackle exactly this problem. When using the build stages, the built-in
# workaround makes Semantic Release unusable, so we need to trick it.
#
# Tracked as https://github.com/semantic-release/semantic-release/issues/390
# Related https://github.com/travis-ci/travis-ci/issues/8239
export TRAVIS_JOB_NUMBER="WORKAROUND.1"
export TRAVIS_TEST_RESULT="0"


$SEMANTIC_RELEASE pre && \
  npm publish && \
  add_stable_dist_tag && \
  $SEMANTIC_RELEASE post
