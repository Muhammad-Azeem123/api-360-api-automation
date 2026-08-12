const { request } = require('@playwright/test');

/**
 * Executes a token refresh request to the /api/refresh endpoint.
 * 
 * @param {string} baseUrl - The base URL of the target API
 * @param {string} tokenToUse - The token to send in the Authorization header
 * @param {boolean} isUsingEnvSeed - Logging flag indicating if the token is from environmental seeds
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number, refreshExpiresIn: number }>}
 */
async function baseRefreshToken(baseUrl, tokenToUse, isUsingEnvSeed) {
  // Standardize token header format
  const authHeader = `Bearer ${tokenToUse}`;

  // Dynamically resolve refresh endpoint relative to baseURL
  let refreshUrl;
  if (baseUrl.endsWith('/api') || baseUrl.endsWith('/api/')) {
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    refreshUrl = `${base}refresh`;
  } else {
    const base = baseUrl.endsWith('/') ? baseUrl : `${base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}api/refresh`;
  }
  // Let's refine the resolution logic safely:
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (baseUrl.endsWith('/api') || baseUrl.endsWith('/api/')) {
    refreshUrl = `${base}refresh`;
  } else {
    refreshUrl = `${base}api/refresh`;
  }

  console.log(`[TokenManager] POST Request -> ${refreshUrl} using ${isUsingEnvSeed ? 'env seed token' : 'stored refresh token'}`);

  const context = await request.newContext({
    ignoreHTTPSErrors: true,
  });

  try {
    const response = await context.post(refreshUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const status = response.status();
    const text = await response.text();

    if (status !== 200) {
      throw new Error(`The Bearer Token is invalid or expired (status ${status}). Please paste a fresh token in the .env file.`);
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (e) {
      throw new Error(`Token refresh response is not valid JSON: ${text}`);
    }

    const accessToken = body.accessToken || body.access_token || body.data?.token?.access_token;
    const refreshToken = body.refreshToken || body.refresh_token || body.data?.token?.refresh_token;
    const expiresIn = body.expiresIn || body.expires_in || body.data?.token?.expires_in;
    const refreshExpiresIn = body.refreshExpiresIn || body.refresh_expires_in || body.data?.token?.refresh_expires_in;

    if (!accessToken) {
      throw new Error(`Response did not contain a valid accessToken.`);
    }

    return {
      accessToken,
      refreshToken: refreshToken || '',
      expiresIn: expiresIn || 0,
      refreshExpiresIn: refreshExpiresIn || 0,
    };
  } finally {
    await context.dispose();
  }
}

module.exports = baseRefreshToken;
