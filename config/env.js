// Load environment variables from the .env file at the project root
require('dotenv').config();

/**
 * Configuration Object.
 * Exposes environment variables to the rest of the application.
 */
const config = {
  // The root URL of the target API, loaded from .env.
  // Defaults to JSONPlaceholder if BASE_URL is not set in the environment.
  baseUrl: process.env.BASE_URL || 'https://apis-dev.api360.sa/portaldev/api',
  // The initial Bearer Token loaded from .env
  authorizationToken: process.env.USER_AUTHORIZATION_TOKEN || process.env.AUTHORIZATION_TOKEN || '',
  userAuthorizationToken: process.env.USER_AUTHORIZATION_TOKEN || process.env.AUTHORIZATION_TOKEN || '',
  adminAuthorizationToken: process.env.ADMIN_AUTHORIZATION_TOKEN || '',
};

module.exports = config;
