// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const html = require('html');

const logger = require('./logger');

const prettifyResponse = function(response) {
  let contentType;
  const stringify = function(obj) {
    try {
      if (typeof obj === 'string') {
        obj = JSON.parse(obj);
      }
      obj = JSON.stringify(obj, null, 2);
    } catch (e) {
      logger.debug(`Could not stringify: ${obj}`);
    }
    return obj;
  };

  const prettifyBody = function(body, contentType) {
    switch (contentType) {
      case 'application/json':
        body = stringify(body);
        break;
      case 'text/html':
        body = html.prettyPrint(body, {indent_size: 2});
        break;
    }
    return body;
  };


  if ((response != null ? response.headers : undefined) != null) { contentType = ((response != null ? response.headers['content-type'] : undefined) || (response != null ? response.headers['Content-Type'] : undefined)); }

  let stringRepresentation = "";

  for (let key of Object.keys(response || {})) {
    let value = response[key];
    if (key === 'body') {
      value = `\n${prettifyBody(value, contentType)}`;
    } else if (key === 'schema') {
      value = `\n${stringify(value)}`;
    } else if (key === 'headers') {
      let header = '\n';
      for (let hkey of Object.keys(value || {})) {
        const hval = value[hkey];
        header += `    ${hkey}: ${hval}\n`;
      }
      value = header;
    }

    stringRepresentation += `${key}: ${value}\n`;
  }

  return stringRepresentation;
};

module.exports = prettifyResponse;
