#!/bin/bash

function term() {
  echo 'exiting'
  exit 0
}

trap 'term' SIGTERM

>&2 echo "error output text"

while true
do
sleep 0.1
done
