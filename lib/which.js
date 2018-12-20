const which = require('which');

module.exports = {
  which(command) {
    try {
      which.sync(command);
      return true;
    } catch (e) {
      return false;
    }
  },
};
