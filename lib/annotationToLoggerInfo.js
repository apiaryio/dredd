import compileTransactionName from './compileTransactionName';

/**
 * Turns annotation type into a log level
 */
function typeToLogLevel(annotationType) {
  const level = { error: 'error', warning: 'warn' }[annotationType];
  if (!level) {
    throw new Error(`Invalid annotation type: '${annotationType}'`);
  }
  return level;
}

/**
 * Takes a component identifier and turns it into something user can understand
 *
 * @param {string} component
 */
function formatComponent(component) {
  switch (component) {
    case 'apiDescriptionParser':
      return 'API description parser';
    case 'parametersValidation':
      return 'API description URI parameters validation';
    case 'uriTemplateExpansion':
      return 'API description URI template expansion';
    default:
      return 'API description';
  }
}

/**
 * Formats given location data as something user can understand
 *
 * @param {string} apiDescriptionLocation API description location name
 * @param {array} annotationLocation See 'dredd-transactions' docs
 */
function formatLocation(apiDescriptionLocation, annotationLocation) {
  if (!annotationLocation) {
    return apiDescriptionLocation;
  }

  const [[startLine, startColumn], [endLine, endColumn]] = annotationLocation;
  const editorLink = `${apiDescriptionLocation}:${startLine}`;
  const from = `line ${startLine} column ${startColumn}`;

  if (startLine === endLine && startColumn === endColumn) {
    return `${editorLink} (${from})`;
  }

  const to =
    startLine === endLine
      ? `column ${endColumn}`
      : `line ${endLine} column ${endColumn}`;
  return `${editorLink} (from ${from} to ${to})`;
}

/**
 * @typedef {Object} LoggerInfo A plain object winston.log() accepts as input
 * @property {string} level
 * @property {string} message
 */

/**
 * Takes API description parser or compiler annotation returned from
 * the 'dredd-transactions' library and transforms it into a message
 * Dredd can show to the user. Returns an object logger accepts as input.
 *
 * @param {string} apiDescriptionLocation API description location name
 * @param {Object} annotation the annotation object from Dredd Transactions
 * @return {LoggerInfo}
 */
export default function annotationToLoggerInfo(
  apiDescriptionLocation,
  annotation,
) {
  const level = typeToLogLevel(annotation.type);

  if (annotation.component === 'apiDescriptionParser') {
    const message =
      `${formatComponent(annotation.component)} ${annotation.type}` +
      ` in ${formatLocation(apiDescriptionLocation, annotation.location)}:` +
      ` ${annotation.message}`;
    return { level, message };
  }

  // See https://github.com/apiaryio/dredd-transactions/issues/275 why this
  // is handled in a different way than parser annotations
  const message =
    `${formatComponent(annotation.component)} ${annotation.type}` +
    ` in ${apiDescriptionLocation} (${compileTransactionName(
      annotation.origin,
    )}):` +
    ` ${annotation.message}`;
  return { level, message };
}
