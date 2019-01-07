module.exports = function parsedPathToOrigin(parsedPath) {
  const result = {
    apiName: parsedPath[0],
    resourceGroupName: parsedPath[1],
    resourceName: parsedPath[2],
    actionName: parsedPath[3],
    exampleName: parsedPath[4],
  };
  return result;
};
