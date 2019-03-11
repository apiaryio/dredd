const blueprintUtils = require('./blueprintUtils');
const defaultLogger = require('./logger');


module.exports = function handleRuntimeProblems(apiDescriptions, logger) {
  logger = logger || defaultLogger;

  let error = false;

  apiDescriptions.forEach((apiDescription) => {
    for (const annotation of apiDescription.annotations) {
      let log;
      let message;
      if (annotation.type === 'warning') {
        log = logger.warn;
      } else {
        error = true;
        log = logger.error;
      }

      if (annotation.component === 'apiDescriptionParser') {
        const ranges = blueprintUtils.warningLocationToRanges(annotation.location, apiDescription.content);
        message = `Parser ${annotation.type} in '${apiDescription.location}': ${annotation.message}`;
        if (ranges && ranges.length) {
          message += ` on ${blueprintUtils.rangesToLinesText(ranges)}`;
        }
        log(message);
      } else {
        const transactionName = [
          annotation.origin.apiName,
          annotation.origin.resourceGroupName,
          annotation.origin.resourceName,
          annotation.origin.actionName,
        ].filter(part => !!part).join(' > ');
        log(`Compilation ${annotation.type} in '${apiDescription.location}': ${annotation.message} (${transactionName})`);
      }
    }
  });

  if (error) {
    return new Error('Error when processing API description.');
  }
};
