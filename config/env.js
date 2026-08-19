const path = require('path');
const dotenv = require('dotenv');

// Explicit environment selection using ENV (default to dev)
const envName = (process.env.ENV || 'dev').toLowerCase().trim();

// Load the appropriate env file. If ENV=stg or staging, load .env.stg; otherwise .env
if (envName === 'stg' || envName === 'staging') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.stg'), override: true });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
}

// Resolve environment values with support for environment-specific prefixed overrides
const resolvedEnv = envName === 'stg' || envName === 'staging' ? 'staging' : 'dev';

let baseUrl;
let userAuthorizationToken;
let adminAuthorizationToken;

if (resolvedEnv === 'staging') {
  baseUrl = process.env.BASE_URL || process.env.STG_BASE_URL || process.env.STAGING_BASE_URL || 'https://apis-stg.api360.sa/portalstg/api/';
  userAuthorizationToken = process.env.STG_USER_REFRESH_TOKEN || process.env.STAGING_USER_REFRESH_TOKEN || process.env.USER_AUTHORIZATION_TOKEN || '';
  adminAuthorizationToken = process.env.STG_ADMIN_REFRESH_TOKEN || process.env.STAGING_ADMIN_REFRESH_TOKEN || process.env.ADMIN_AUTHORIZATION_TOKEN || '';
} else {
  baseUrl = process.env.BASE_URL || process.env.DEV_BASE_URL || 'https://apis-dev.api360.sa/portaldev/api';
  userAuthorizationToken = process.env.DEV_USER_REFRESH_TOKEN || process.env.USER_AUTHORIZATION_TOKEN || '';
  adminAuthorizationToken = process.env.DEV_ADMIN_REFRESH_TOKEN || process.env.ADMIN_AUTHORIZATION_TOKEN || '';
}

console.log(`[Config] Selected Environment: ${resolvedEnv.toUpperCase()}`);
console.log(`[Config] Base URL: ${baseUrl}`);

let apiPrefix = '';
try {
  const parsedUrl = new URL(baseUrl);
  apiPrefix = parsedUrl.pathname;
  if (apiPrefix.endsWith('/')) {
    apiPrefix = apiPrefix.slice(0, -1);
  }
} catch (e) {
  apiPrefix = resolvedEnv === 'staging' ? '/portalstg/api' : '/portaldev/api';
}

const config = {
  env: resolvedEnv,
  baseUrl,
  apiPrefix,
  authorizationToken: userAuthorizationToken, // backward compatibility helper
  userAuthorizationToken,
  adminAuthorizationToken,
};

module.exports = config;
