#!/bin/bash
# In the ReadTheDocs build, this file is ran by Sphinx' conf.py to install
# support for Node.js.

set -e


if [ "$READTHEDOCS" = 'True' ]; then
    if [ ! -d ~/.nvm ]; then
        git clone git://github.com/creationix/nvm.git ~/.nvm
    fi
    . ~/.nvm/nvm.sh

    nvm install 6
    nvm use 6

    npm install --no-optional

    echo $(which node)
fi
