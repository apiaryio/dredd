const createOriginSchema = require('./origin');
const createPathOriginSchema = require('./path-origin');
const createAnnotationSchema = require('./annotation');


const addMinMax = function(schema, n) {
  if (n.length === 1) { // [min]
    schema.minItems = n[0];
  } else if (n.length === 2) { // [min, max]
    [schema.minItems, schema.maxItems] = Array.from(n);
  } else { // exact number
    schema.minItems = n;
    schema.maxItems = n;
  }
  return schema;
};


module.exports = function(options = {}) {
  // Either filename string or undefined (= doesn't matter)
  const { filename } = options;

  // Either exact number or interval ([1, 4] means 1 min, 4 max)
  const annotations = options.annotations || 0;
  const transactions = (options.transactions != null) ? options.transactions : [1];

  const headersSchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: {type: 'string'},
        value: {type: 'string'}
      }
    }
  };

  const requestSchema = {
    type: 'object',
    properties: {
      uri: {type: 'string', pattern: '^/'},
      method: {type: 'string'},
      headers: headersSchema,
      body: {type: 'string'}
    },
    required: ['uri', 'method', 'headers'],
    additionalProperties: false
  };

  const responseSchema = {
    type: 'object',
    properties: {
      status: {type: 'string'},
      headers: headersSchema,
      body: {type: 'string'},
      schema: {type: 'string'}
    },
    required: ['status', 'headers'],
    additionalProperties: false
  };

  const transactionSchema = {
    type: 'object',
    properties: {
      request: requestSchema,
      response: responseSchema,
      origin: createOriginSchema({filename}),
      name: {type: 'string'},
      pathOrigin: createPathOriginSchema(),
      path: {type: 'string'}
    },
    required: ['request', 'response', 'origin', 'name', 'pathOrigin', 'path'],
    additionalProperties: false
  };

  const transactionsSchema = addMinMax({
    type: 'array',
    items: transactionSchema
  }
  , transactions);

  const annotationsSchema = addMinMax({
    type: 'array',
    items: createAnnotationSchema({filename})
  }
  , annotations);

  return {
    type: 'object',
    properties: {
      mediaType: {anyOf: [{type: 'string'}, {type: 'null'}]},
      transactions: transactionsSchema,
      annotations: annotationsSchema
    },
    required: ['mediaType', 'transactions', 'annotations'],
    additionalProperties: false
  };
};
