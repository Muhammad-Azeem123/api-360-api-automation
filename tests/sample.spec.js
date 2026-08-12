// @ts-check
const { test, expect } = require('@playwright/test');
const apiClient = require('../utils/apiClient');

test.describe('API to fetch Apps', () => {

  test('should fetch Apps and return 200', async () => {
    const endpoint = '/portaldev/api/apps';
    console.log(`[Request] GET -> ${endpoint}`);

    // Reusable apiClient singleton automatically retrieves and injects the active Bearer token.
    const response = await apiClient.get(endpoint);

    console.log(`[Response] Status: ${response.status}`);
    console.log(`[Response] Body:`, JSON.stringify(response.body, null, 2));

    expect(response.status).toBe(200);
  });

});
