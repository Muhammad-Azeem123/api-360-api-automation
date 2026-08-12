const baseRefreshToken = require('../baseRefreshToken');
const config = require('../../config/env');

/**
 * Admin-specific refresh token utility.
 */
async function refreshAdminToken(tokenToUse, isUsingEnvSeed) {
  return await baseRefreshToken(config.baseUrl, tokenToUse, isUsingEnvSeed);
}

module.exports = refreshAdminToken;
