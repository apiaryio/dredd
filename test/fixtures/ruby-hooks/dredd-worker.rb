require 'socket'
require 'json'


# Disables stdout buffering. This makes node.js able to capture stdout of this process with no delay
# http://stackoverflow.com/questions/23001033/how-to-live-stream-output-from-ruby-script-using-child-process-spawn
$stdout.sync = true

HOST = '127.0.0.1'
PORT = 61321
MESSAGE_DELIMITER = "\n"

@before_hooks = {}
@before_validation_hooks = {}
@after_hooks = {}

def before transaction_name, &block
  @before_hooks[transaction_name] = [] if @before_hooks[transaction_name].nil?
  @before_hooks[transaction_name].push block
end

def before_validation transaction_name, &block
  @before_validation_hooks[transaction_name] = [] if @before_validation_hooks[transaction_name].nil?
  @before_validation_hooks[transaction_name].push block
end

def after transaction_name, &block
  @after_hooks[transaction_name] = [] if @after_hooks[transaction_name].nil?
  @after_hooks[transaction_name].push block
end

def run_before_hooks_for_transaction transaction
  transaction_name = transaction["name"]
  hooks = @before_hooks[transaction_name]
  if hooks.kind_of? Array
    hooks.each do |hook_proc|
      hook_proc.call transaction
    end
  end
  return transaction
end

def run_before_validation_hooks_for_transaction transaction
  transaction_name = transaction["name"]
  hooks = @before_validation_hooks[transaction_name]
  if hooks.kind_of? Array
    hooks.each do |hook_proc|
      hook_proc.call transaction
    end
  end
  return transaction
end

def run_after_hooks_for_transaction transaction
  transaction_name = transaction["name"]
  hooks = @after_hooks[transaction_name]
  if hooks.kind_of? Array
    hooks.each do |hook_proc|
      hook_proc.call transaction
    end
  end
  return transaction
end

def process_message message, client
  event = message['event']
  transaction = message['transaction']

  if event == "before"
    transaction = run_before_hooks_for_transaction transaction
  end

  if event == "beforeValidation"
    transaction = run_before_validation_hooks_for_transaction transaction
  end

  if event == "after"
    transaction = run_after_hooks_for_transaction transaction
  end

  to_send = {
    "uuid" => message['uuid'],
    "event" => event,
    "transaction" => transaction
  }.to_json
  client.puts to_send + "\n"
end

def run_server
  server = TCPServer.new HOST, PORT
  loop do
    #Thread.abort_on_exception=true
    client = server.accept
    STDERR.puts 'Dredd connected to Ruby Dredd hooks worker'
    buffer = ""
    while (data = client.recv(10))
      buffer += data
      if buffer.include? MESSAGE_DELIMITER
        splitted_buffer = buffer.split(MESSAGE_DELIMITER)
        buffer = ""

        messages = []

        splitted_buffer.each do |message|
          begin
            messages.push JSON.parse(message)

          rescue JSON::ParserError
            # if message aftger delimiter is not parseable json, it's
            # a chunk of next message, put it back to the buffer
            buffer += message
          end
        end

        messages.each do |message|
          process_message message, client
        end
      end
    end
    client.close
  end
end

#
# Register hooks here!
#

# Tranasction object in the block is passed back to Dredd, so you can
# modify it, save response to stash, or programatically fail the transaction
# by setting trabsaction['fail'] to some message
#
# Let's inspect transaction object:
#
# puts JSON.pretty_generate(transaction)

stash = ""

before 'Machines > Machines collection > Get Machines' do |transaction|
  puts 'ruby before hook'
end

before_validation 'Machines > Machines collection > Get Machines' do |transaction|
  puts 'ruby before validation hook'
end

after 'Machines > Machines collection > Get Machines' do |transaction|
  puts 'ruby after hook'
  puts 'Stash content: ' + stash
  transaction['fail'] = 'Yay! Failed in ruby!'
end


# Run hooks server
puts 'Dredd Ruby hooks worker is running'

run_server
