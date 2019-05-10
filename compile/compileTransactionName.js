module.exports = function compileTransactionName(origin) {
  return [
    origin.apiName,
    origin.resourceGroupName,
    origin.resourceName,
    origin.actionName,
    origin.exampleName,
  ]
    .filter(Boolean)
    .join(' > ');
};
