const BaseTokenManager = require('../baseTokenManager');
const path = require('path');
const refreshToken = require('./refreshToken');

/**
 * Admin Token Manager singleton instance.
 * Configured with its own storage paths and environment keys.
 */
class AdminTokenManager extends BaseTokenManager {
  constructor() {
    super({
      tokenPath: path.join(__dirname, '../../storage/admin-token.json'),
      envVarName: 'ADMIN_AUTHORIZATION_TOKEN',
      refreshTokenFunc: refreshToken,
    });
  }
}

module.exports = new AdminTokenManager();
