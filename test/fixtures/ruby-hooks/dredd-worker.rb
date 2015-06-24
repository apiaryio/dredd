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

@before_each_hooks = []
@before_each_validation_hooks = []
@after_each_hooks = []

@before_all_hooks = []
@after_all_hooks = []

#
# Ruby hooks API
#

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

def before_each &block
  @before_each_hooks.push block
end

def before_each_validation &block
  @before_each_validation_hooks.push block
end

def after_each &block
  @after_each_hooks.push block
end

def before_all &block
  @before_all_hooks.push block
end

def after_all &block
  @after_all_hooks.push block
end

#
# Runers for Transaction specific hooks
#

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

#
# Runners for *_each hooks API
#

def run_before_each_hooks_for_transaction transaction
  @before_each_hooks.each do |hook_proc|
    hook_proc.call transaction
  end
  return transaction
end

def run_before_each_validation_hooks_for_transaction transaction
  @before_each_validation_hooks.each do |hook_proc|
    hook_proc.call transaction
  end
  return transaction
end

def run_after_each_hooks_for_transaction transaction
  @after_each_hooks.each do |hook_proc|
    hook_proc.call transaction
  end
  return transaction
end


#
# Runners for *_all hooks API
#

def run_before_all_hooks_for_transactions transactions
  @before_all_hooks.each do |hook_proc|
    hook_proc.call transactions
  end
  return transactions
end

def run_after_all_hooks_for_transactions transactions
  @after_all_hooks.each do |hook_proc|
    hook_proc.call transactions
  end
  return transactions
end


#
# The hooks worker server
#

def process_message message, client
  event = message['event']
  data = message['data']

  if event == "before"
    data = run_before_each_hooks_for_transaction data
    data = run_before_hooks_for_transaction data
  end

  if event == "beforeValidation"
    data = run_before_each_validation_hooks_for_transaction data
    data = run_before_validation_hooks_for_transaction data
  end

  if event == "after"
    data = run_after_hooks_for_transaction data
    data = run_after_each_hooks_for_transaction data
  end

  if event == "beforeAll"
    data = run_before_all_hooks_for_transactions data
  end

  if event == "afterAll"
    data = run_after_all_hooks_for_transactions data
  end

  to_send = {
    "uuid" => message['uuid'],
    "event" => event,
    "data" => data
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
# Hooks code here
#

# Tranasction object in the block is passed back to Dredd, so you can
# modify it, save response to stash, or programatically fail the transaction
# by setting trabsaction['fail'] to some message
#
# Let's inspect transaction object:
#
# puts JSON.pretty_generate(transaction)

stash = ""


# *_each hooks
before_each do |transaction|
  transaction['hooks_mods'] = [] if transaction['hooks_modifications'].nil?
  transaction['hooks_modifications'].push "ruby before each mod"
  puts 'ruby before each hook'
end

before_each_validation do |transaction|
  transaction['hooks_modifications'] = [] if transaction['hooks_modifications'].nil?
  transaction['hooks_modifications'].push "ruby before each validation mod"
  puts 'ruby before each validation hook'
end

after_each do |transaction|
  transaction['hooks_modifications'] = [] if transaction['hooks_modifications'].nil?
  transaction['hooks_modifications'].push "ruby after each mod"
  puts 'ruby after each hook'
end

# Transaction specific hooks
before 'Machines > Machines collection > Get Machines' do |transaction|
  transaction['hooks_modifications'] = [] if transaction['hooks_modifications'].nil?
  transaction['hooks_modifications'].push "ruby before mod"
  puts 'ruby before hook'
end

before_validation 'Machines > Machines collection > Get Machines' do |transaction|
  transaction['hooks_modifications'] = [] if transaction['hooks_modifications'].nil?
  transaction['hooks_modifications'].push "ruby before validation mod"
  puts 'ruby before validation hook'
end

after 'Machines > Machines collection > Get Machines' do |transaction|
  transaction['hooks_modifications'] = [] if transaction['hooks_modifications'].nil?
  transaction['hooks_modifications'].push "ruby after mod"
  puts 'ruby after hook'
  puts 'Stash content: ' + stash
  transaction['fail'] = 'Yay! Failed in ruby!'
end

# *_all hooks
before_all do |transactions|
  transactions[0]['hooks_modifications'] = [] if transactions[0]['hooks_modifications'].nil?
  transactions[0]['hooks_modifications'].push "ruby before all mod"
  puts 'ruby before all hook'
end

after_all do |transactions|
  transactions[0]['hooks_modifications'] = [] if transactions[0]['hooks_modifications'].nil?
  transactions[0]['hooks_modifications'].push "ruby after all mod"
  puts 'ruby after all hook'
end

# Run hooks server
puts 'Dredd Ruby hooks worker is running'

run_server
