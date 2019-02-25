module.exports = function compileTransactionName(origin) {
  const segments = [];
  if (origin.apiName) { segments.push(origin.apiName); }
  if (origin.resourceGroupName) { segments.push(origin.resourceGroupName); }
  if (origin.resourceName) { segments.push(origin.resourceName); }
  if (origin.actionName) { segments.push(origin.actionName); }
  if (origin.exampleName) { segments.push(origin.exampleName); }
  return segments.join(' > ');
};
