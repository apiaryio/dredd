module.exports = () => ({
  type: 'object',
  properties: {
    apiName: { type: 'string' },
    resourceGroupName: { type: 'string' },
    resourceName: { type: 'string' },
    actionName: { type: 'string' },
    exampleName: { type: 'string' },
  },
  required: ['apiName', 'resourceGroupName', 'resourceName', 'actionName', 'exampleName'],
  additionalProperties: false,
});
