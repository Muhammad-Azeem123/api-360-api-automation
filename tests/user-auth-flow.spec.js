const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const tokenManager = require('../utils/tokenManager');
const apiClient = require('../utils/apiClient');

test.describe('Authentication & Token Manager Unit Tests', () => {

  test('isTokenValid should correctly check JWT structure and expiration', () => {
    // 1. Invalid or empty tokens
    expect(tokenManager.isTokenValid(null)).toBe(false);
    expect(tokenManager.isTokenValid('')).toBe(false);
    expect(tokenManager.isTokenValid('not.a.jwt')).toBe(false);

    // 2. Mock a non-expired JWT payload (exp is far in the future)
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const validPayload = Buffer.from(JSON.stringify({ exp: futureExp, sub: 'user123' })).toString('base64');
    const signature = 'mockSignature';
    const validToken = `${header}.${validPayload}.${signature}`;

    expect(tokenManager.isTokenValid(validToken)).toBe(true);

    // 3. Mock an expired JWT payload (exp in the past)
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const expiredPayload = Buffer.from(JSON.stringify({ exp: pastExp, sub: 'user123' })).toString('base64');
    const expiredToken = `${header}.${expiredPayload}.${signature}`;

    expect(tokenManager.isTokenValid(expiredToken)).toBe(false);
  });

  test('saveTokens and getAccessToken should persist and retrieve tokens successfully', () => {
    const backupPath = path.join(__dirname, '../storage/token.json.backup');
    const tokenPath = path.join(__dirname, '../storage/token.json');

    // Backup existing token file if it exists
    let backupCreated = false;
    if (fs.existsSync(tokenPath)) {
      fs.copyFileSync(tokenPath, backupPath);
      backupCreated = true;
    }

    try {
      const testTokens = {
        accessToken: 'access_token_mock_123',
        refreshToken: 'refresh_token_mock_123',
        expiresIn: 3600,
        refreshExpiresIn: 7200
      };

      // Save using tokenManager
      tokenManager.saveTokens(testTokens);

      // Verify cached retrieve
      expect(tokenManager.getAccessToken()).toBe('access_token_mock_123');
      expect(tokenManager.getRefreshToken()).toBe('refresh_token_mock_123');

      // Verify file is updated in both new and legacy formats
      const fileData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      expect(fileData.accessToken).toBe('access_token_mock_123');
      expect(fileData.data.token.access_token).toBe('access_token_mock_123');
      expect(fileData.data.token.refresh_token).toBe('refresh_token_mock_123');

    } finally {
      // Restore backup if it was created
      if (backupCreated) {
        fs.copyFileSync(backupPath, tokenPath);
        fs.unlinkSync(backupPath);
      }
      tokenManager.clearCache();
    }
  });

  test('apiClient should automatically inject Bearer token into outgoing requests', async () => {
    // 1. Ensure the token exists in tokenManager
    const token = tokenManager.getAccessToken();
    expect(token).toBeTruthy();

    // 2. Execute GET request using apiClient without any custom headers argument
    const endpoint = '/portaldev/api/lookups/top-category';
    const response = await apiClient.get(endpoint);

    // 3. Verify it still returns 200 OK (meaning token was automatically injected and request succeeded)
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

});
