#!/bin/bash
sleep 0.1
ps aux | grep "bash" | grep "fixtures/scripts/kill-self.sh" | grep -v grep | awk '{print $2}' | xargs kill -9
