const BaseTokenManager = require('../baseTokenManager');
const path = require('path');
const config = require('../../config/env');
const refreshToken = require('./refreshToken');

/**
 * Admin Token Manager singleton instance.
 * Configured with its own storage paths and environment keys.
 */
class AdminTokenManager extends BaseTokenManager {
  constructor() {
    const isStaging = config.env === 'staging';
    const tokenPath = isStaging
      ? path.join(__dirname, '../../storage/staging/admin-token.json')
      : path.join(__dirname, '../../storage/admin-token.json');

    super({
      tokenPath,
      envVarName: 'ADMIN_AUTHORIZATION_TOKEN',
      refreshTokenFunc: refreshToken,
    });
  }
}

module.exports = new AdminTokenManager();
