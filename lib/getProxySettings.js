const PROXY_ENV_VARIABLES = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'];

/**
 * Expects an environment variables object (typically process.env)
 * and returns an array of strings representing HTTP proxy settings,
 * such as ['HTTPS_PROXY=https://proxy.example.com:8080', ...]
 *
 * Supports both upper and lower case names and skips env vars set as empty
 * strings (other falsy values are not taken care of as env vars can only
 * be strings).
 *
 * Note: The settings are later only printed to the user. Applying the settings
 * is handled directly by the 'request' library, see
 * https://github.com/request/request#user-content-proxies
 */
export default function getProxySettings(env) {
  return Object.entries(env)
    .filter((entry) => PROXY_ENV_VARIABLES.includes(entry[0].toUpperCase()))
    .filter((entry) => entry[1] !== '')
    .map((entry) => `${entry[0]}=${entry[1]}`);
}
