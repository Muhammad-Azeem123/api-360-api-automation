const BaseTokenManager = require('../baseTokenManager');
const path = require('path');
const config = require('../../config/env');
const refreshToken = require('./refreshToken');

/**
 * User Token Manager singleton instance.
 * Configured with its own storage paths and environment keys.
 */
class UserTokenManager extends BaseTokenManager {
  constructor() {
    const isStaging = config.env === 'staging';
    const tokenPath = isStaging
      ? path.join(__dirname, '../../storage/staging/user-token.json')
      : path.join(__dirname, '../../storage/user-token.json');
    const legacyTokenPaths = isStaging
      ? []
      : [path.join(__dirname, '../../storage/token.json')];

    super({
      tokenPath,
      envVarName: 'USER_AUTHORIZATION_TOKEN',
      fallbackEnvVarName: 'AUTHORIZATION_TOKEN',
      legacyTokenPaths,
      refreshTokenFunc: refreshToken,
    });
  }
}

module.exports = new UserTokenManager();
