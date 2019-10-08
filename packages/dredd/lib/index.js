// This is an explicit package entry for proper exports.
// When exported via "export default", the Dredd package
// would need to be required as:
//
// const Dredd = require('dredd').default
//
// To prevent this, using "module.exports".
import Dredd from './Dredd';

module.exports = Dredd;
