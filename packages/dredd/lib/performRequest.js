import axios from 'axios';
import caseless from 'caseless';

import defaultLogger from './logger';

/**
 * Performs the HTTP request as described in the 'transaction.request' object
 *
 * In future we should introduce a 'real' request object as well so user has
 * access to the modifications made on the way.
 *
 * @param {string} uri
 * @param {Object} transactionReq
 * @param {Object} [options]
 * @param {Object} [options.logger] Custom logger
 * @param {Object} [options.request] Custom 'request' library implementation
 * @param {Object} [options.http] Custom default 'request' library options
 * @param {Function} callback
 */
function performRequest(uri, transactionReq, options, callback) {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }
  const logger = options.logger || defaultLogger;
  const request = options.request || axios; // choose whether to use existing request information or use a new axios configuration

  const httpOptions = Object.assign({}, options.http || {});
  httpOptions.proxy = false;
  httpOptions.followRedirect = false;
  httpOptions.encoding = null;
  httpOptions.method = transactionReq.method.toLowerCase();
  httpOptions.uri = uri;

  try {
    httpOptions.data = getBodyAsBuffer(
      transactionReq.body,
      transactionReq.bodyEncoding,
    );
    httpOptions.headers = normalizeContentLengthHeader(
      transactionReq.headers,
      httpOptions.data,
    );

    const protocol = httpOptions.uri.split(':')[0].toUpperCase();
    logger.debug(
      `Performing ${protocol} request to the server under test: ` +
        `${httpOptions.method} ${httpOptions.uri}`,
    );
      // Reconfigure function to follow axios formatting
    request(options).then((response) => {
      logger.debug(`Handling ${protocol} response from the server under test`);
      callback(null, createTransactionResponse(response, response.data));

    }).catch((error) => {
      callback(error);
    });
  } catch (error) {
    process.nextTick(() => callback(error));
  }
}

/**
 * Coerces the HTTP request body to a Buffer
 *
 * @param {string|Buffer} body
 * @param {*} encoding
 */
export function getBodyAsBuffer(body, encoding) {
  return body instanceof Buffer
    ? body
    : Buffer.from(`${body || ''}`, normalizeBodyEncoding(encoding));
}

/**
 * Returns the encoding as either 'utf-8' or 'base64'. Throws
 * an error in case any other encoding is provided.
 *
 * @param {string} encoding
 */
export function normalizeBodyEncoding(encoding) {
  if (!encoding) {
    return 'utf-8';
  }

  switch (encoding.toLowerCase()) {
    case 'utf-8':
    case 'utf8':
      return 'utf-8';
    case 'base64':
      return 'base64';
    default:
      throw new Error(
        `Unsupported encoding: '${encoding}' (only UTF-8 and ` +
          'Base64 are supported)',
      );
  }
}

/**
 * Detects an existing Content-Length header and overrides the user-provided
 * header value in case it's out of sync with the real length of the body.
 *
 * @param {Object} headers HTTP request headers
 * @param {Buffer} body HTTP request body
 * @param {Object} [options]
 * @param {Object} [options.logger] Custom logger
 */
export function normalizeContentLengthHeader(headers, body, options = {}) {
  const logger = options.logger || defaultLogger;

  const modifiedHeaders = Object.assign({}, headers);
  const calculatedValue = Buffer.byteLength(body);
  const name = caseless(modifiedHeaders).has('Content-Length');
  if (name) {
    const value = parseInt(modifiedHeaders[name], 10);
    if (value !== calculatedValue) {
      modifiedHeaders[name] = `${calculatedValue}`;
      logger.warn(
        `Specified Content-Length header is ${value}, but the real ` +
          `body length is ${calculatedValue}. Using ${calculatedValue} instead.`,
      );
    }
  } else {
    modifiedHeaders['Content-Length'] = `${calculatedValue}`;
  }
  return modifiedHeaders;
}

/**
 * Real transaction response object factory. Serializes binary responses
 * to string using Base64 encoding.
 *
 * @param {Object} response Node.js HTTP response
 * @param {Buffer} body HTTP response body as Buffer
 */
export function createTransactionResponse(response, body) {
  const transactionRes = {
    status: response.status,
    headers: Object.assign({}, response.headers),
  };
  if (Buffer.byteLength(body || '')) {
    transactionRes.bodyEncoding = detectBodyEncoding(body);
    transactionRes.body = body.toString(transactionRes.bodyEncoding);
  }
  return transactionRes;
}

/**
 * @param {Buffer} body
 */
export function detectBodyEncoding(body) {
  // U+FFFD is a replacement character in UTF-8 and indicates there
  // are some bytes which could not been translated as UTF-8. Therefore
  // let's assume the body is in binary format. Dredd encodes binary as
  // Base64 to be able to transfer it wrapped in JSON over the TCP to non-JS
  // hooks implementations.
  return body.toString().includes('\ufffd') ? 'base64' : 'utf-8';
}

export default performRequest;
