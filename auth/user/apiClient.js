const BaseApiClient = require('../baseApiClient');
const tokenManager = require('./tokenManager');

/**
 * Reusable User API Client.
 * Automatically injects the active User Bearer token into outgoing requests.
 */
class UserApiClient extends BaseApiClient {
  constructor() {
    super(tokenManager);
  }
}

module.exports = new UserApiClient();
