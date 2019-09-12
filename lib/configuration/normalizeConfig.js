const R = require('ramda');

/**
 * Removes options that are no longer supported by Dredd.
 * Any coercion will not be performed, as they are removed prior to coercion.
 */
const removeUnsupportedOptions = R.compose(
  R.dissoc('q'),
  R.dissoc('silent'),
  R.dissoc('t'),
  R.dissoc('timestamp'),
  R.dissoc('blueprintPath'),
  R.dissoc('b'),
  R.dissoc('sandbox')
);

const getUserHeader = R.compose(
  token => `Authorization: Basic ${token}`,
  user => Buffer.from(user).toString('base64')
);

const updateHeaderWithUser = R.compose(
  R.unnest,
  R.adjust(0, getUserHeader),
  R.values,
  R.pick(['user', 'header'])
);

const coerceToArray = R.cond([
  [R.is(String), v => [v]],
  [R.isNil, R.always([])],
  [R.T, R.identity],
]);

function coerceToBoolean(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value) return true;
  return false;
}

/**
 * Appends authorization header when supplied with "user" option.
 */
const coerceUserOption = R.when(
  R.propSatisfies(R.complement(R.isNil), 'user'),
  R.compose(
    R.dissoc('user'),
    R.over(
      R.lens(updateHeaderWithUser, R.assoc('header')),
      R.identity
    )
  )
);

const mapIndexed = R.addIndex(R.map);

const coerceApiDescriptions = R.compose(
  mapIndexed((content, index) => ({
    location: `configuration.apiDescriptions[${index}]`,
    content: R.when(R.has('content'), R.prop('content'), content),
  })),
  coerceToArray
);

const coerceLevel = R.compose(
  R.cond([
    [
      R.includes(R.__, ['silly', 'debug', 'verbose']),
      R.always('debug'),
    ],
    [R.equals('error'), R.always('error')],
    [R.equals('silent'), R.always('silent')],
    [R.T, R.always('warn')],
  ]),
  R.either(R.prop('l'), R.prop('level'))
);

/**
 * Coerces the given deprecated value of the "level" option
 * and returns the supported value for "loglevel" option.
 */
const coerceDeprecatedLevelOption = R.when(
  R.either(R.has('l'), R.has('level')),
  R.compose(
    R.dissoc('l'),
    R.dissoc('level'),
    R.over(
      R.lens(coerceLevel, R.assoc('loglevel')),
      R.identity
    )
  )
);

const coerceDataToApiDescriptions = R.compose(
  R.unnest,
  R.values,
  R.evolve({
    data: R.compose(
      R.map(([location, content]) => {
        const apiDescription = (typeof content === 'string')
          ? { location, content }
          : {
            location: content.filename,
            content: content.raw,
          };

        return apiDescription;
      }),
      R.toPairs
    ),
  }),
  R.pick(['apiDescriptions', 'data'])
);

const coerceDeprecatedDataOption = R.when(
  R.propSatisfies(R.complement(R.isNil), 'data'),
  R.compose(
    R.dissoc('data'),
    R.over(
      R.lens(
        coerceDataToApiDescriptions,
        R.assoc('apiDescriptions')
      ),
      R.identity
    )
  )
);

/**
 * Creates a new object with the own properties of the provided object, but the
 * keys renamed according to the keysMap object as `{oldKey: newKey}`.
 * When some key is not found in the keysMap, then it's passed as-is.
 *
 * @see https://github.com/ramda/ramda/wiki/Cookbook#rename-keys-of-an-object
 * @sig {a: b} -> {a: *} -> {b: *}
 */
const renameKeys = R.curry((keysMap, obj) => (
  R.reduce((acc, key) => R.assoc(keysMap[key] || key, obj[key], acc), {}, R.keys(obj))
));

const coerceDeprecatedHooksHandlerOptions = renameKeys({
  'hooks-worker-timeout': 'hooks-handler-timeout',
  'hooks-worker-connect-timeout': 'hooks-handler-connect-timeout',
  'hooks-worker-connect-retry': 'hooks-handler-connect-retry',
  'hooks-worker-after-connect-wait': 'hooks-handler-after-connect-wait',
  'hooks-worker-term-timeout': 'hooks-handler-term-timeout',
  'hooks-worker-term-retry': 'hooks-handler-term-retry',
  'hooks-worker-handler-host': 'hooks-handler-host',
  'hooks-worker-handler-port': 'hooks-handler-port',
});


const coerceColorOption = R.when(
  R.has('c'),
  R.compose(
    R.dissoc('c'),
    R.over(
      R.lens(R.prop('c'), R.assoc('color')),
      coerceToBoolean
    )
  )
);

const coerceDeprecatedOptions = R.compose(
  coerceColorOption,
  coerceDeprecatedDataOption,
  coerceDeprecatedLevelOption,
  coerceDeprecatedHooksHandlerOptions
);

const coerceOptions = R.compose(
  coerceDeprecatedOptions,
  coerceUserOption,
  R.evolve({
    color: coerceToBoolean,
    apiDescriptions: coerceApiDescriptions,
    reporter: coerceToArray,
    output: coerceToArray,
    header: coerceToArray,
    method: R.compose(R.map(R.toUpper), coerceToArray),
    only: coerceToArray,
    path: coerceToArray,
    hookfiles: coerceToArray,
  })
);

const normalizeConfig = R.compose(
  coerceOptions,
  removeUnsupportedOptions
);

normalizeConfig.removeUnsupportedOptions = removeUnsupportedOptions;
normalizeConfig.coerceToArray = coerceToArray;
normalizeConfig.coerceToBoolean = coerceToBoolean;
normalizeConfig.coerceUserOption = coerceUserOption;
normalizeConfig.coerceApiDescriptions = coerceApiDescriptions;
normalizeConfig.coerceColorOption = coerceColorOption;
normalizeConfig.coerceDeprecatedLevelOption = coerceDeprecatedLevelOption;
normalizeConfig.coerceDeprecatedDataOption = coerceDeprecatedDataOption;
normalizeConfig.coerceDeprecatedHooksHandlerOptions = coerceDeprecatedHooksHandlerOptions;

module.exports = normalizeConfig;
