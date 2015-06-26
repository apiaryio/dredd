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

include DreddWorker::Hooks

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
