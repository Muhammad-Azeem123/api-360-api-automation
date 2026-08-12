const BaseTokenManager = require('../baseTokenManager');
const path = require('path');
const refreshToken = require('./refreshToken');

/**
 * User Token Manager singleton instance.
 * Configured with its own storage paths and environment keys.
 */
class UserTokenManager extends BaseTokenManager {
  constructor() {
    super({
      tokenPath: path.join(__dirname, '../../storage/user-token.json'),
      envVarName: 'USER_AUTHORIZATION_TOKEN',
      fallbackEnvVarName: 'AUTHORIZATION_TOKEN',
      legacyTokenPaths: [path.join(__dirname, '../../storage/token.json')],
      refreshTokenFunc: refreshToken,
    });
  }
}

module.exports = new UserTokenManager();
