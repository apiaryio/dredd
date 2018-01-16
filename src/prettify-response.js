const html = require('html');

const logger = require('./logger');

module.exports = function prettifyResponse(response) {
  let contentType;

  function stringify(obj) {
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

  function prettifyBody(body, contentType) {
    switch (contentType) {
      case 'application/json':
        body = stringify(body);
        break;
      case 'text/html':
        body = html.prettyPrint(body, { indent_size: 2 });
        break;
    }
    return body;
  };


  if (response && response.headers) {
    contentType = response.headers['content-type'] || response.headers['Content-Type'];
  }

  let stringRepresentation = '';
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
