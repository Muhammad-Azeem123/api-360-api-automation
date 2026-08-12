// Backward compatibility bridge. Re-exports the User token manager from the new auth/ directory.
const userTokenManager = require('../auth/user/tokenManager');

module.exports = userTokenManager;
