const createLocationSchema = require('./createLocationSchema');
const createOriginSchema = require('./createOriginSchema');

const TYPES = ['error', 'warning'];


module.exports = function createAnnotationSchema(options = {}) {
  // Either filename string or undefined (= doesn't matter)
  const { filename } = options;

  // options.message should be substring or RegExp
  const messageSchema = { type: 'string' };
  if (options.message) { messageSchema.pattern = options.message; }

  const parseAnnotationSchema = {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: options.type ? [options.type] : TYPES,
      },
      component: {
        type: 'string',
        enum: ['apiDescriptionParser'],
      },
      message: messageSchema,
      location: createLocationSchema(),
    },
    required: ['type', 'component', 'message', 'location'],
    additionalProperties: false,
  };
  if (options.component === 'apiDescriptionParser') {
    return parseAnnotationSchema;
  }

  const compileAnnotationSchema = {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: options.type ? [options.type] : TYPES,
      },
      component: {
        type: 'string',
        enum: options.component ? [options.component] : ['parametersValidation', 'uriTemplateExpansion'],
      },
      message: messageSchema,
      location: { type: 'null' }, // https://github.com/apiaryio/dredd-transactions/issues/275
      name: { type: 'string' },
      origin: createOriginSchema({ filename }),
    },
    required: ['type', 'component', 'message', 'location', 'name', 'origin'],
    additionalProperties: false,
  };
  if (['parametersValidation', 'uriTemplateExpansion'].includes(options.component)) {
    return compileAnnotationSchema;
  }

  return { anyOf: [parseAnnotationSchema, compileAnnotationSchema] };
};
