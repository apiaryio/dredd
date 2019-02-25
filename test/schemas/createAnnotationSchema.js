const createLocationSchema = require('./createLocationSchema');
const createOriginSchema = require('./createOriginSchema');

const TYPES = ['error', 'warning'];
const COMPONENTS = ['apiDescriptionParser', 'parametersValidation', 'uriTemplateExpansion'];


module.exports = function createAnnotationSchema(options = {}) {
  // Either filename string or undefined (= doesn't matter)
  const { filename } = options;

  // options.message should be substring or RegExp
  const messageSchema = { type: 'string' };
  if (options.message) { messageSchema.pattern = options.message; }

  return {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: options.type ? [options.type] : TYPES,
      },
      component: {
        type: 'string',
        enum: options.component ? [options.component] : COMPONENTS,
      },
      message: messageSchema,
      location: createLocationSchema(),
      origin: createOriginSchema({ filename }),
    },
    required: ['type', 'component', 'message', 'location'],
    dependencies: {
      origin: {
        properties: {
          component: {
            enum: ['parametersValidation', 'uriTemplateExpansion'],
          },
        },
      },
    },
    additionalProperties: false,
  };
};
