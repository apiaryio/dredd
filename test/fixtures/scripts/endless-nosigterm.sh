#!/bin/bash
function term() {
  echo 'ignoring sigterm'
}

trap 'term' SIGTERM

while true
do
sleep 1
done
