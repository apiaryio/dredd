// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const which = require('which');


module.exports = {
  which(command) {
    try {
      which.sync(command);
      return true;
    } catch (e) {
      return false;
    }
  }
};
