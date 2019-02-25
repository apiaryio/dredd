module.exports = function createOriginSchema(options = {}) {
  let filenameSchema;
  if (options.filename) {
    filenameSchema = { type: 'string', enum: [options.filename] };
  } else {
    filenameSchema = { type: 'string' };
  }

  return {
    type: 'object',
    properties: {
      filename: filenameSchema,
      apiName: { type: 'string' },
      resourceGroupName: { type: 'string' },
      resourceName: { type: 'string' },
      actionName: { type: 'string' },
      exampleName: { type: 'string' },
    },
    required: ['filename', 'apiName', 'resourceGroupName', 'resourceName', 'actionName', 'exampleName'],
    additionalProperties: false,
  };
};
