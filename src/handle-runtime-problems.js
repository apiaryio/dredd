const blueprintUtils = require('./blueprint-utils');
const logger = require('./logger');

module.exports = function handleRuntimeProblems(blueprintData) {
  let error = false;

  for (const filename of Object.keys(blueprintData || {})) {
    const data = blueprintData[filename];
    const apiDescriptionDocument = data.raw;

    for (const annotation of data.annotations) {
      let log;
      let message;
      if (annotation.type === 'warning') {
        log = logger.warn;
      } else {
        error = true;
        log = logger.error;
      }

      if (annotation.component === 'apiDescriptionParser') {
        const ranges = blueprintUtils.warningLocationToRanges(annotation.location, apiDescriptionDocument);
        message = `Parser ${annotation.type} in file '${filename}': ${annotation.message}`;
        if (ranges && ranges.length) {
          message += ` on ${blueprintUtils.rangesToLinesText(ranges)}`;
        }
        log(message);
      } else {
        const transactionName = [
          annotation.origin.resourceGroupName,
          annotation.origin.resourceName,
          annotation.origin.actionName
        ].join(' > ');
        log(`Compilation ${annotation.type} in file '${filename}': ${annotation.message} (${transactionName})`);
      }
    }
  }

  if (error) {
    return new Error('Error when processing API description.');
  }
};
