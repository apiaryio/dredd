require File.join(File.dirname(__FILE__), './dredd-worker/hooks.rb')
require File.join(File.dirname(__FILE__), './dredd-worker/runner.rb')
require File.join(File.dirname(__FILE__), './dredd-worker/file_loader.rb')
require File.join(File.dirname(__FILE__), './dredd-worker/server.rb')

# Disables stdout buffering. This makes node.js able to capture stdout of this process with no delay
# http://stackoverflow.com/questions/23001033/how-to-live-stream-output-from-ruby-script-using-child-process-spawn
$stdout.sync = true

DreddWorker::FileLoader.load ARGV

server = DreddWorker::Server.new
server.run
