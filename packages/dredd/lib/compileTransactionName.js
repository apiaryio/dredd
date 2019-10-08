// This file is copy-pasted "as is" from the Dredd Transactions library, where
// it's also tested. This is a temporary solution,
// see https://github.com/apiaryio/dredd-transactions/issues/276
export default function compileTransactionName(origin) {
  const segments = [];
  if (origin.apiName) {
    segments.push(origin.apiName);
  }
  if (origin.resourceGroupName) {
    segments.push(origin.resourceGroupName);
  }
  if (origin.resourceName) {
    segments.push(origin.resourceName);
  }
  if (origin.actionName) {
    segments.push(origin.actionName);
  }
  if (origin.exampleName) {
    segments.push(origin.exampleName);
  }
  return segments.join(' > ');
}
