const baseRefreshToken = require('../baseRefreshToken');
const config = require('../../config/env');

/**
 * User-specific refresh token utility.
 */
async function refreshUserToken(tokenToUse, isUsingEnvSeed) {
  return await baseRefreshToken(config.baseUrl, tokenToUse, isUsingEnvSeed);
}

module.exports = refreshUserToken;
