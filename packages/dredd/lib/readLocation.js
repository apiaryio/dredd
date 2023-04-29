import fs from 'fs';
import axios from 'axios';

import isURL from './isURL';

function getErrorFromResponse(response, hasBody) {
  const contentType = response.headers['content-type'];
  if (hasBody) {
    const bodyDescription = contentType
      ? `'${contentType}' body`
      : 'body without Content-Type';
    return new Error(
      `Dredd got HTTP ${response.statusCode} response with ${bodyDescription}`,
    );
  }
  return new Error(
    `Dredd got HTTP ${response.statusCode} response without body`,
  );
}

function readRemoteFile(uri, options, callback) {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }
  const request = options.request || axios; // choose whether to use existing request information or use a new axios configuration

  const httpOptions = Object.assign({}, options.http || {});
  httpOptions.uri = uri;
  httpOptions.timeout = 5000; // ms, limits both connection time and server response time

  try {
    //Reconfigure request to follow axios formatting
    request(httpOptions).then((response) => {
      if(!response){
        callback(new Error('Unexpected error'));
      } else if (
        !response.data || 
        response.status < 200 || 
        response.status >= 300) {
          callback(getErrorFromResponse(response, !!response.data));
      } else {
        callback(null, response.data);
      }
    }).catch((error) => {
      callback(error);
    });
  } catch (error) {
    process.nextTick(() => callback(error));
  }
}

function readLocalFile(path, callback) {
  fs.readFile(path, 'utf8', (error, data) => {
    if (error) {
      callback(error);
      return;
    }
    callback(null, data);
  });
}

export default function readLocation(location, options, callback) {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }
  if (isURL(location)) {
    readRemoteFile(location, options, callback);
  } else {
    readLocalFile(location, callback);
  }
}
