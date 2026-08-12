// Backward compatibility bridge. Re-exports the User API client from the new auth/ directory.
const userApiClient = require('../auth/user/apiClient');

module.exports = userApiClient;
