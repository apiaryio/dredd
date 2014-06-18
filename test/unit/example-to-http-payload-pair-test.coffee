{assert} = require 'chai'

exampleToHttpPayloadPairs = require '../../src/example-to-http-payload-pair'

describe 'exampleToHttpPayloadPair()', () ->
  data = null
  example = 
    name: "Simple name"
    description: "Very clear description"
    requests: [
      name: "JSON request"
      headers:
        'Content-Type': 'application/json'
        'Accept': 'application/json'
      body: '{"foo": "bar"}'
    ]
    responses: [
      name: '200'
      headers:
        'Content-Type': 'application/json'
      body: '{"foo": "bar"}'
    ]
  before () -> 
    data = exampleToHttpPayloadPairs example

  it 'should return an object', () ->
    assert.isObject data

  it 'should set response status', () ->
    assert.isNotNull data['pair']['response']['status']

  describe 'when single request and response per example', () ->
    it 'should return no error', () ->
      assert.equal data['errors'].length, 0    
    
    it 'should return no warnings', () ->
      assert.equal data['errors'].length, 0    

    it 'should return example request and response pair', () ->
      assert.notEqual Object.keys(data['pair']), 0

    describe 'when response schema is empty string', () ->
      before () ->
        example['responses'][0]['schema'] = ""
        data = exampleToHttpPayloadPairs example
      
      it 'should remove schema key from response', () ->
        assert.isUndefined data['pair']['response']['schema']
    
    describe 'when response schema is not empty string', () ->
      before () ->
        example['responses'][0]['schema'] = "{}"
        data = exampleToHttpPayloadPairs example
      
      it 'should add schema key to response', () ->
        assert.isDefined data['pair']['response']['schema']


  describe 'when multiple requests per example', () ->
    before () -> 
      example = 
        name: "Simple name"
        description: "Very clear description"
        requests: [
          {
            name: "JSON request"
            headers:
              'Content-Type': 'application/json'
              'Accept': 'application/json'
            body: '{"foo": "bar"}'
          }, {
            name: "Text request"
            headers:
              'Content-Type': 'text/plain'
              'Accept': 'text/plain'
            body: 'Foo is bar'
          }
        ]
        responses: [
          name: '200'
          headers:
            'Content-Type': 'application/json'
          body: '{"foo": "bar"}'
        ]

      data = exampleToHttpPayloadPairs example

    it 'should return no error', () ->
      assert.equal data['errors'].length, 0    
    
    it 'should return some warnings', () ->
      assert.equal data['warnings'].length, 1

    describe 'returned warning', () ->
      warning = ''
      before () ->
        warning = data['warnings'][data['warnings'].length - 1] 

      it 'sohuld contain proper text', () ->
        text = "Multiple requests, using first."
        assert.include warning, text 

    describe 'returned payload pair', () ->
      it 'should contain first request', () ->
        assert.equal example['requests'][0]['body'], data['pair']['request']['body']
  
  describe 'when multiple responses per example', () ->
    before () -> 
      example = 
        name: "Simple name"
        description: "Very clear description"
        requests: [
          {
            name: "JSON request"
            headers:
              'Content-Type': 'application/json'
              'Accept': 'application/json'
            body: '{"foo": "bar"}'
          }
        ]
        responses: [
          {
            name: '200'
            headers:
              'Content-Type': 'application/json'
            body: '{"foo": "bar"}'
          },
          {
            name: '404'
            headers:
              'Content-Type': 'application/json'
            body: '{"message": "Not found"}'
          }          
        ]

      data = exampleToHttpPayloadPairs example

    it 'should return no error', () ->
      assert.equal data['errors'].length, 0    
    
    it 'should return some warnings', () ->
      assert.equal data['warnings'].length, 1

    describe 'returned warning', () ->
      warning = ''
      before () ->
        warning = data['warnings'][data['warnings'].length - 1] 
      
      it 'sohuld contain proper text', () ->
        text = "Multiple responses, using first."

        assert.include warning, text
    
    describe 'returned payload pair', () ->
      it 'should contain first response', () ->
        assert.equal example['responses'][0]['body'], data['pair']['response']['body']
       
  describe 'when no request', () ->
    before () -> 
      example = 
        name: "Simple name"
        description: "Very clear description"
        requests: []
        responses: [
          {
            name: '200'
            headers:
              'Content-Type': 'application/json'
            body: '{"foo": "bar"}'
          }        
        ]

      data = exampleToHttpPayloadPairs example

    it 'should return no error', () ->
      assert.equal data['errors'].length, 0    
    
    it 'should return no warnings', () ->
      assert.equal data['warnings'].length, 0

    describe 'returned payload pair request', () ->
      request = {}
      before () ->
        request = data['pair']['request']
            
      it 'should have body with empty string', () ->
        assert.equal request['body'], ''

  describe 'when no response', () ->
    before () -> 
      example = 
        name: "Simple name"
        description: "Very clear description"
        requests: [
          {
            name: "JSON request"
            headers:
              'Content-Type': 'application/json'
              'Accept': 'application/json'
            body: '{"foo": "bar"}'
          }
        ]
        responses: [
        ]

      data = exampleToHttpPayloadPairs example

    it 'should return no error', () ->
      assert.equal data['errors'].length, 0    
    
    it 'should return some warnings', () ->
      assert.equal data['warnings'].length, 1
    describe 'returned warning', () ->
      warning = ''
      before () ->
        warning = data['warnings'][data['warnings'].length - 1] 
      
      it 'sohuld contain proper text', () ->
        text = "No response available."
        assert.include warning, text
    
    it 'should not return any response pair', () ->
      assert.deepEqual data['pair'], {}
