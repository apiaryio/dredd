#!/bin/sh
docker run -ti --rm -v $(pwd)/docs:/docs:rw -w /docs apiaryio/base-sphinx-doc-dev $@
