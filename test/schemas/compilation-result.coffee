createOriginSchema = require('./origin')
createPathOriginSchema = require('./path-origin')
createAnnotationSchema = require('./annotation')


addMinMax = (schema, n) ->
  if n.length is 1 # [min]
    schema.minItems = n[0]
  else if n.length is 2 # [min, max]
    [schema.minItems, schema.maxItems] = n
  else # exact number
    schema.minItems = n
    schema.maxItems = n
  schema


module.exports = (options = {}) ->
  # Either filename string or undefined (= doesn't matter)
  filename = options.filename

  # Either exact number or interval ([1, 4] means 1 min, 4 max)
  annotations = options.annotations or 0
  transactions = if options.transactions? then options.transactions else [1]

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

  transactionsSchema = addMinMax(
    type: 'array'
    items: transactionSchema
  , transactions)

  annotationsSchema = addMinMax(
    type: 'array'
    items: createAnnotationSchema({filename})
  , annotations)

  {
    type: 'object'
    properties:
      mediaType: {anyOf: [{type: 'string'}, {type: 'null'}]}
      transactions: transactionsSchema
      annotations: annotationsSchema
    required: ['mediaType', 'transactions', 'annotations']
    additionalProperties: false
  }
