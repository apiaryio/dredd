include DreddWorker::Hooks

after_all do |transactions|
  puts 'ruby hooks second file'
end