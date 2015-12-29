#!/bin/bash
function term() {
  echo 'Caught SIGNTERM, exiting.'
  exit 0
}

trap 'term' SIGTERM

while true
do
sleep 0.1
done
