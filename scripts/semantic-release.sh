#!/bin/sh
# Publishes new Dredd release to npm registry


SEMANTIC_RELEASE=./node_modules/.bin/semantic-release


add_stable_dist_tag() {
  PACKAGE_NAME=$(coffee -e 'console.log(require("./package.json").name)')
  PACKAGE_VERSION=$(coffee -e 'console.log(require("./package.json").version)')

  npm dist-tag add "$PACKAGE_NAME@$PACKAGE_VERSION" stable
  return $?
}


$SEMANTIC_RELEASE pre && \
  npm publish && \
  add_stable_dist_tag && \
  $SEMANTIC_RELEASE post
