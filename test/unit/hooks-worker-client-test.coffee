describe 'Hooks worker client', () ->

  describe "when it's loaded", () ->


    describe 'when --language ruby option is given', () ->
      it 'should spawn the server process with command "dredd-worker-ruby"'

    describe 'when --language python option is given', () ->
      it 'should spawn the server process with command "dredd-worker-python"'

    describe 'when --language ./eny/other-command is giveb', () ->
      it 'should run this command given as language option'

    it 'should pipe spawned process stderr to the Dredd process stderr'

    it 'should pipe spawned process stdut to the Dredd process stdout'
    it 'should Dredd with status > 1 when spawned process ends with exit status > 0'

    it 'should connect to the server'

    it 'should assign the client under "hookClient" on the hook object'
    it 'should assign the spawned server under "hookServer" on the hook object'

    eventTypes = [
      'before'
      'beforeValidation'
      'after'
      'beforeAll'
      'afterAll'
    ]

    for eventType in eventTypes then do (eventType) ->
      it "should register hook function for hook type #{eventType}"


  eventTypes = [
    'before'
    'beforeValidation'
    'after'
  ]

  for eventType in eventTypes then do (eventType) ->
    describe 'when "#{eventType}" hook function is triggered', () ->
      it 'should send a json to the socket ending with delimiter character'

      describe 'sent object', () ->

        keys = [
          'data'
          'event'
          'uuid'
        ]

        for key in keys then do (key) ->
          it "should contain key #{key}"

        it "key event should have value #{eventType}"

      describe 'when timeouted', () ->
        it 'should send timeout message to the transaction'

      describe 'when server sends a response with mathcing uuid', () ->
        it 'should add data from the response to the transaction'

  eventTypes = [
    'beforeAll'
    'afterAll'
  ]

  for eventType in eventTypes then do (eventType) ->
    describe 'when "#{eventType}" hook function is triggered', () ->
      it 'should send a json to the socket ending with delimiter character'

      describe 'sent JSON object', () ->
        it 'should be an array'

        describe 'every member', () ->
          it 'should be a object'

          keys = [
            'data'
            'event'
            'uuid'
          ]
          for key in keys then do (key) ->
            it "should contain key #{key}"

        it "key event should have value #{eventType}"

      describe 'when timeouted', () ->
        it 'should log the timeout'

      describe 'when server sends a response with mathcing uuid', () ->
        it 'should add data from the response to the transaction'


