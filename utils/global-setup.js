const userTokenManager = require('../auth/user/tokenManager');
const adminTokenManager = require('../auth/admin/tokenManager');

/**
 * Playwright Global Setup function.
 * Runs once before all tests execute.
 * Sequentially refreshes both the User token and the Admin token,
 * halting execution if either flow fails.
 */
async function globalSetup(config) {
  if (process.env.SKIP_GLOBAL_SETUP === 'true') {
    console.log('[Global Setup] SKIP_GLOBAL_SETUP is true. Skipping pre-test token refresh flow.');
    return;
  }
  console.log('[Global Setup] Starting pre-test token refresh flow...');
  
  try {
    console.log('[Global Setup] Refreshing User Token...');
    await userTokenManager.refresh();
    console.log('[Global Setup] User Token refresh completed successfully.');
  } catch (error) {
    console.error(`\n======================================================================`);
    console.error(`ERROR: User Authentication Failed during Global Setup: ${error.message}`);
    console.error(`======================================================================\n`);
    throw error;
  }

  try {
    console.log('[Global Setup] Refreshing Admin Token...');
    await adminTokenManager.refresh();
    console.log('[Global Setup] Admin Token refresh completed successfully.');
  } catch (error) {
    console.error(`\n======================================================================`);
    console.error(`ERROR: Admin Authentication Failed during Global Setup: ${error.message}`);
    console.error(`======================================================================\n`);
    throw error;
  }

  console.log('[Global Setup] All token refresh steps completed successfully.');
}

module.exports = globalSetup;
