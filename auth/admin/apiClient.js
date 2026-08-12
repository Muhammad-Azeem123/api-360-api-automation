const BaseApiClient = require('../baseApiClient');
const tokenManager = require('./tokenManager');

/**
 * Reusable Admin API Client.
 * Automatically injects the active Admin Bearer token into outgoing requests.
 */
class AdminApiClient extends BaseApiClient {
  constructor() {
    super(tokenManager);
  }
}

module.exports = new AdminApiClient();
