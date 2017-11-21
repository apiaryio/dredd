// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
module.exports = () =>
  ({
    type: 'object',
    properties: {
      apiName: { type: 'string' },
      resourceGroupName: { type: 'string' },
      resourceName: { type: 'string' },
      actionName: { type: 'string' },
      exampleName: { type: 'string' }
    },
    required: ['apiName', 'resourceGroupName', 'resourceName', 'actionName', 'exampleName'],
    additionalProperties: false
  })
;
