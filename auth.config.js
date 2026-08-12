const config = require('./config/env');

module.exports = {
  // Manual Bearer/Refresh Token Configuration.
  // Paste your token in the .env file under AUTHORIZATION_TOKEN.
  AUTHORIZATION_TOKEN: config.authorizationToken || '',
  USER_AUTHORIZATION_TOKEN: config.userAuthorizationToken || '',
  ADMIN_AUTHORIZATION_TOKEN: config.adminAuthorizationToken || '',
};
