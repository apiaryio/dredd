
createLocationSchema = require('./location')
createOriginSchema = require('./origin')
createPathOriginSchema = require('./path-origin')


addMinMax = (schema, n) ->
  if n is true
    schema.minItems = 1
  else
    schema.minItems = n
    schema.maxItems = n
  schema


module.exports = (options = {}) ->
  # Either filename string or undefined (= doesn't matter)
  filename = options.filename

  # Either exact number or true (= more than one)
  annotations = options.annotations or 0
  transactions = options.transactions or 0

  annotationSchema =
    type: 'object'
    properties:
      type:
        type: 'string'
        enum: ['error', 'warning']
      component:
        type: 'string'
        enum: [
          'apiDescriptionParser'
          'parametersValidation'
          'uriTemplateExpansion'
        ]
      message: {type: 'string'}
      location: createLocationSchema()
    required: ['type', 'component', 'message', 'location']
    additionalProperties: false

  headersSchema =
    type: 'array'
    items:
      type: 'object'
      properties:
        name: {type: 'string'}
        value: {type: 'string'}

  requestSchema =
    type: 'object'
    properties:
      uri: {type: 'string', pattern: '^/'}
      method: {type: 'string'}
      headers: headersSchema
      body: {type: 'string'}
    required: ['uri', 'method', 'headers']
    additionalProperties: false

  responseSchema =
    type: 'object'
    properties:
      status: {type: 'string'}
      headers: headersSchema
      body: {type: 'string'}
      schema: {type: 'string'}
    required: ['status', 'headers']
    additionalProperties: false

  transactionSchema =
    type: 'object'
    properties:
      request: requestSchema
      response: responseSchema
      origin: createOriginSchema({filename})
      name: {type: 'string'}
      pathOrigin: createPathOriginSchema()
      path: {type: 'string'}
    required: ['request', 'response', 'origin', 'name', 'pathOrigin', 'path']
    additionalProperties: false

  {
    type: 'object'
    properties:
      mediaType: {anyOf: [{type: 'string'}, {type: 'null'}]}
      transactions: addMinMax({type: 'array', items: transactionSchema}, transactions)
      annotations: addMinMax({type: 'array', items: annotationSchema}, annotations)
    required: ['mediaType', 'transactions', 'annotations']
    additionalProperties: false
  }
