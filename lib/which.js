import which from 'which';

export default {
  which(command) {
    try {
      which.sync(command);
      return true;
    } catch (e) {
      return false;
    }
  },
};
