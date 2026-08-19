const { test, expect } = require('@playwright/test');
const adminApiClient = require('../../../auth/admin/apiClient');

test.describe('Admin Version Service', () => {
  test('should give all versions', async () => {
    // Fetch first page of versions
    console.log(`----------------------------------------`);
    console.log(`Fetching submitted versions (Page: 1, PageSize: 100)...`);
    const response = await adminApiClient.get('/api/admin/versions?page=1&pageSize=100');
    
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();

    const body = response.body;
    expect(body).toHaveProperty('data');
    
    const versions = body.data;
    
    console.log(`Successfully fetched ${versions.length} versions.`);
    console.log('Versions List:', JSON.stringify(versions, null, 2));
    
    expect(Array.isArray(versions)).toBe(true);
  });
});

