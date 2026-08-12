const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const adminTokenManager = require('../auth/admin/tokenManager');
const userTokenManager = require('../auth/user/tokenManager');
const adminApiClient = require('../auth/admin/apiClient');
const userApiClient = require('../auth/user/apiClient');

test.describe('Admin Authentication & Token Manager Unit Tests', () => {

  test('should expose the same methods on both clients', () => {
    const requiredMethods = ['get', 'post', 'put', 'delete', 'patch'];
    for (const method of requiredMethods) {
      expect(typeof adminApiClient[method]).toBe('function');
      expect(typeof userApiClient[method]).toBe('function');
    }
  });

  test('admin token validation should correctly check JWT structure and expiration', () => {
    expect(adminTokenManager.isTokenValid(null)).toBe(false);
    expect(adminTokenManager.isTokenValid('')).toBe(false);
    expect(adminTokenManager.isTokenValid('not.a.jwt')).toBe(false);

    // Mock a non-expired JWT payload (exp is far in the future)
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const validPayload = Buffer.from(JSON.stringify({ exp: futureExp, sub: 'admin123' })).toString('base64');
    const signature = 'mockSignature';
    const validToken = `${header}.${validPayload}.${signature}`;

    expect(adminTokenManager.isTokenValid(validToken)).toBe(true);

    // Mock an expired JWT payload (exp in the past)
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const expiredPayload = Buffer.from(JSON.stringify({ exp: pastExp, sub: 'admin123' })).toString('base64');
    const expiredToken = `${header}.${expiredPayload}.${signature}`;

    expect(adminTokenManager.isTokenValid(expiredToken)).toBe(false);
  });

  test('admin saveTokens and getAccessToken should persist and retrieve tokens successfully with isolation', () => {
    const adminTokenPath = path.join(__dirname, '../storage/admin-token.json');
    const userTokenPath = path.join(__dirname, '../storage/user-token.json');
    const legacyTokenPath = path.join(__dirname, '../storage/token.json');

    const adminBackupPath = `${adminTokenPath}.backup`;
    const userBackupPath = `${userTokenPath}.backup`;
    const legacyBackupPath = `${legacyTokenPath}.backup`;

    let adminBackupCreated = false;
    let userBackupCreated = false;
    let legacyBackupCreated = false;

    // Backup existing token files
    if (fs.existsSync(adminTokenPath)) {
      fs.copyFileSync(adminTokenPath, adminBackupPath);
      adminBackupCreated = true;
    }
    if (fs.existsSync(userTokenPath)) {
      fs.copyFileSync(userTokenPath, userBackupPath);
      userBackupCreated = true;
    }
    if (fs.existsSync(legacyTokenPath)) {
      fs.copyFileSync(legacyTokenPath, legacyBackupPath);
      legacyBackupCreated = true;
    }

    try {
      const mockAdminTokens = {
        accessToken: 'admin_access_token_mock_999',
        refreshToken: 'admin_refresh_token_mock_999',
        expiresIn: 3600,
        refreshExpiresIn: 7200
      };

      const mockUserTokens = {
        accessToken: 'user_access_token_mock_888',
        refreshToken: 'user_refresh_token_mock_888',
        expiresIn: 3600,
        refreshExpiresIn: 7200
      };

      // 1. Save and verify Admin tokens
      adminTokenManager.saveTokens(mockAdminTokens);
      expect(adminTokenManager.getAccessToken()).toBe('admin_access_token_mock_999');
      expect(adminTokenManager.getRefreshToken()).toBe('admin_refresh_token_mock_999');

      // 2. Save and verify User tokens
      userTokenManager.saveTokens(mockUserTokens);
      expect(userTokenManager.getAccessToken()).toBe('user_access_token_mock_888');
      expect(userTokenManager.getRefreshToken()).toBe('user_refresh_token_mock_888');

      // 3. Verify files exist and contain correct data
      const adminFileData = JSON.parse(fs.readFileSync(adminTokenPath, 'utf8'));
      expect(adminFileData.accessToken).toBe('admin_access_token_mock_999');

      const userFileData = JSON.parse(fs.readFileSync(userTokenPath, 'utf8'));
      expect(userFileData.accessToken).toBe('user_access_token_mock_888');

      const legacyFileData = JSON.parse(fs.readFileSync(legacyTokenPath, 'utf8'));
      expect(legacyFileData.accessToken).toBe('user_access_token_mock_888'); // legacy should be written by user manager

      // 4. Verify absolute separation in cache
      expect(adminTokenManager.getAccessToken()).toBe('admin_access_token_mock_999');
      expect(userTokenManager.getAccessToken()).toBe('user_access_token_mock_888');

    } finally {
      // Restore backups
      if (adminBackupCreated) {
        fs.copyFileSync(adminBackupPath, adminTokenPath);
        fs.unlinkSync(adminBackupPath);
      } else if (fs.existsSync(adminTokenPath)) {
        fs.unlinkSync(adminTokenPath);
      }

      if (userBackupCreated) {
        fs.copyFileSync(userBackupPath, userTokenPath);
        fs.unlinkSync(userBackupPath);
      } else if (fs.existsSync(userTokenPath)) {
        fs.unlinkSync(userTokenPath);
      }

      if (legacyBackupCreated) {
        fs.copyFileSync(legacyBackupPath, legacyTokenPath);
        fs.unlinkSync(legacyBackupPath);
      } else if (fs.existsSync(legacyTokenPath)) {
        fs.unlinkSync(legacyTokenPath);
      }

      adminTokenManager.clearCache();
      userTokenManager.clearCache();
    }
  });

});
