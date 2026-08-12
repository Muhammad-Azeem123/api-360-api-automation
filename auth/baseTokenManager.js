const fs = require('fs');
const path = require('path');

/**
 * Base Token Manager.
 * Reusable token operations class to handle specific identity lifecycles without duplication.
 */
class BaseTokenManager {
  /**
   * @param {object} options
   * @param {string} options.tokenPath - Destination storage JSON path
   * @param {string} options.envVarName - Environment variable name for the refresh/authorization seed
   * @param {string} [options.fallbackEnvVarName] - Optional fallback env variable name for backward compatibility
   * @param {string[]} [options.legacyTokenPaths] - Optional legacy paths to mirror token writes
   * @param {Function} options.refreshTokenFunc - Specific function that executes the POST request to refresh
   */
  constructor(options) {
    this.tokenPath = options.tokenPath;
    this.envVarName = options.envVarName;
    this.fallbackEnvVarName = options.fallbackEnvVarName;
    this.legacyTokenPaths = options.legacyTokenPaths || [];
    this.refreshTokenFunc = options.refreshTokenFunc;
    this.cache = null;
  }

  /**
   * Cleans up the token string to strip quotes, trailing semicolons, angle brackets, or 'Bearer ' prefixes.
   * 
   * @param {string} token
   * @returns {string}
   */
  sanitizeToken(token) {
    if (!token || typeof token !== 'string') return '';
    let clean = token.trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1).trim();
    }
    if (clean.endsWith(';')) {
      clean = clean.slice(0, -1).trim();
    }
    if (clean.toUpperCase().startsWith('BEARER ')) {
      clean = clean.slice(7).trim();
    }
    if (clean.startsWith('<') && clean.endsWith('>')) {
      clean = clean.slice(1, -1).trim();
    }
    return clean;
  }

  /**
   * Clears the in-memory token cache. Useful for unit testing.
   */
  clearCache() {
    this.cache = null;
  }

  /**
   * Loads token data from disk. Caches the result in memory.
   * 
   * @returns {object|null}
   */
  loadTokens() {
    // Check if legacy paths have been updated/restored externally (e.g. by legacy unit tests)
    for (const legacyPath of this.legacyTokenPaths) {
      try {
        if (fs.existsSync(legacyPath) && fs.existsSync(this.tokenPath)) {
          const primaryContent = fs.readFileSync(this.tokenPath, 'utf8');
          const legacyContent = fs.readFileSync(legacyPath, 'utf8');
          if (primaryContent !== legacyContent) {
            // Sync primary file with legacy content
            fs.writeFileSync(this.tokenPath, legacyContent, 'utf8');
            this.cache = JSON.parse(legacyContent);
            console.log(`[TokenManager] Auto-synced primary storage ${this.tokenPath} with legacy storage ${legacyPath}`);
            return this.cache;
          }
        }
      } catch (err) {
        console.error(`[TokenManager] Error syncing legacy token: ${err.message}`);
      }
    }

    if (this.cache) return this.cache;
    try {
      if (fs.existsSync(this.tokenPath)) {
        const content = fs.readFileSync(this.tokenPath, 'utf8');
        this.cache = JSON.parse(content);
        return this.cache;
      }
    } catch (error) {
      console.error(`[TokenManager] Error reading token file at ${this.tokenPath}: ${error.message}`);
    }
    return null;
  }

  /**
   * Retrieves the current access token.
   * 
   * @returns {string|null}
   */
  getAccessToken() {
    const tokens = this.loadTokens();
    const token = tokens?.accessToken || tokens?.data?.token?.access_token || null;
    return this.sanitizeToken(token);
  }

  /**
   * Retrieves the current refresh token.
   * 
   * @returns {string|null}
   */
  getRefreshToken() {
    const tokens = this.loadTokens();
    const token = tokens?.refreshToken || tokens?.data?.token?.refresh_token || null;
    return this.sanitizeToken(token);
  }

  /**
   * Writes refreshed tokens to disk and updates the memory cache.
   * Saves in both flat format and legacy nested structure.
   * 
   * @param {object} tokensData
   */
  saveTokens(tokensData) {
    const accessToken = this.sanitizeToken(tokensData.accessToken);
    const refreshToken = this.sanitizeToken(tokensData.refreshToken);
    const { expiresIn, refreshExpiresIn } = tokensData;
    
    const dir = path.dirname(this.tokenPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload = {
      accessToken,
      refreshToken,
      expiresIn,
      refreshExpiresIn,
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
          refresh_expires_in: refreshExpiresIn,
        },
      },
    };

    fs.writeFileSync(this.tokenPath, JSON.stringify(payload, null, 2), 'utf8');
    this.cache = payload;
    console.log(`[TokenManager] Saved refreshed tokens to ${this.tokenPath}`);

    // If legacy paths are configured, sync writes to them as well
    for (const legacyPath of this.legacyTokenPaths) {
      try {
        const legacyDir = path.dirname(legacyPath);
        if (!fs.existsSync(legacyDir)) {
          fs.mkdirSync(legacyDir, { recursive: true });
        }
        fs.writeFileSync(legacyPath, JSON.stringify(payload, null, 2), 'utf8');
        console.log(`[TokenManager] Mirrored refreshed tokens to legacy path: ${legacyPath}`);
      } catch (err) {
        console.error(`[TokenManager] Error writing to legacy path ${legacyPath}: ${err.message}`);
      }
    }
  }

  /**
   * Helper to check if a JWT is valid and not expired.
   * 
   * @param {string} token
   * @returns {boolean}
   */
  isTokenValid(token) {
    const sanitized = this.sanitizeToken(token);
    if (!sanitized) return false;
    try {
      const parts = sanitized.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (!payload.exp) return true;
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > (now + 10); // 10s buffer
    } catch (e) {
      return false;
    }
  }

  /**
   * General refresh handler logic.
   */
  async refresh() {
    this.cache = null; // force cache reload from disk
    const storedAccess = this.getAccessToken();
    const storedRefresh = this.getRefreshToken();

    const config = require('../config/env');
    const authConfig = require('../auth.config');

    // Retrieve environmental token configuration values
    const envTokenVal = authConfig[this.envVarName] || 
                         (this.fallbackEnvVarName ? authConfig[this.fallbackEnvVarName] : '') || 
                         config[this.envVarName] || 
                         (this.fallbackEnvVarName ? config[this.fallbackEnvVarName] : '');
    const envToken = this.sanitizeToken(envTokenVal);

    let tokenToUse = '';
    let isUsingEnvSeed = false;

    const isEnvTokenNew = envToken && envToken !== storedAccess && envToken !== storedRefresh;

    if (isEnvTokenNew) {
      console.log(`[TokenManager] New token detected in .env configuration. Forcing refresh using this token.`);
      tokenToUse = envToken;
      isUsingEnvSeed = true;
    } else if (storedAccess && this.isTokenValid(storedAccess)) {
      console.log(`[TokenManager] Valid access token found in ${this.tokenPath}. Skipping refresh.`);
      return;
    } else if (storedRefresh && this.isTokenValid(storedRefresh)) {
      console.log(`[TokenManager] Stored access token is expired, but stored refresh token is valid. Attempting refresh.`);
      tokenToUse = storedRefresh;
    } else if (envToken) {
      console.log(`[TokenManager] No valid stored tokens found. Falling back to env seed token (${this.envVarName}).`);
      tokenToUse = envToken;
      isUsingEnvSeed = true;
    }

    if (!tokenToUse) {
      throw new Error(`Your Bearer Token (${this.envVarName}) has expired or is invalid. Please paste a fresh token in the .env file.`);
    }

    try {
      const refreshedTokens = await this.refreshTokenFunc(tokenToUse, isUsingEnvSeed);
      this.saveTokens(refreshedTokens);
    } catch (error) {
      if (error.message.includes('expired or is invalid') || error.message.includes('Please paste a fresh token')) {
        throw error;
      }
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
}

module.exports = BaseTokenManager;
