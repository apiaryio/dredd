require 'socket'
require 'json'

module DreddWorker
  class Server
    #
    # The hooks worker server
    #

    HOST = '127.0.0.1'
    PORT = 61321
    MESSAGE_DELIMITER = "\n"

    @server = nil

    def process_message message, client
      event = message['event']
      data = message['data']

      if event == "before"
        data = DreddWorker::Runner.run_before_each_hooks_for_transaction data
        data = DreddWorker::Runner.run_before_hooks_for_transaction data
      end

      if event == "beforeValidation"
        data = DreddWorker::Runner.run_before_each_validation_hooks_for_transaction data
        data = DreddWorker::Runner.run_before_validation_hooks_for_transaction data
      end

      if event == "after"
        data = DreddWorker::Runner.run_after_hooks_for_transaction data
        data = DreddWorker::Runner.run_after_each_hooks_for_transaction data
      end

      if event == "beforeAll"
        data = DreddWorker::Runner.run_before_all_hooks_for_transactions data
      end

      if event == "afterAll"
        data = DreddWorker::Runner.run_after_all_hooks_for_transactions data
      end

      to_send = {
        "uuid" => message['uuid'],
        "event" => event,
        "data" => data
      }.to_json
      client.puts to_send + "\n"
    end

    def run
      @server = TCPServer.new HOST, PORT
      loop do
        #Thread.abort_on_exception=true
        client = @server.accept
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
  end
end