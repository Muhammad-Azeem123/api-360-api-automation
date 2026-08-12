const { test, expect } = require('@playwright/test');
const adminApiClient = require('../../../auth/admin/apiClient');

test.describe('Admin > Approve API', () => {

  test('should successfully approve a submitted Vendor API Product version', async () => {
    // Step 1: Call GET /api/admin/versions
    console.log(`----------------------------------------`);
    console.log(`Fetching submitted versions (Page: 1, PageSize: 10)...`);
    const response = await adminApiClient.get('/portaldev/api/admin/versions?page=1&pageSize=10');
    
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('data');

    // Step 2: Read response and find the first available version that is pending review
    const body = response.body;
    const versions = body.data;

    if (!versions || versions.length === 0) {
      const errorMsg = 'No submitted API versions available for approval.';
      console.log(errorMsg);
      throw new Error(errorMsg);
    }

    // Find the first version that is pending review
    const pendingVersion = versions.find(v => v.pending_review === true || v.status === 'pending_review' || v.status === 'submitted');

    if (!pendingVersion) {
      const errorMsg = 'No pending review API versions available for approval.';
      console.log(errorMsg);
      throw new Error(errorMsg);
    }

    const versionId = pendingVersion.id;
    if (!versionId) {
      throw new Error('Found version, but it does not contain a valid ID.');
    }

    console.log(`Found Pending Version:\nID: ${versionId}\nVersion: ${pendingVersion.version_number}\nStatus: ${pendingVersion.status}`);
    
    // Step 3: Approve the version
    console.log(`Approving Version: ${versionId}...`);
    const approveResponse = await adminApiClient.post(`/portaldev/api/admin/versions/${versionId}/approve`, {});

    // If the approval request fails: print status, response body, and fail the test.
    if (approveResponse.status < 200 || approveResponse.status >= 300) {
      console.error(`Approval failed with HTTP Status: ${approveResponse.status}`);
      console.error(`Response Body:`, JSON.stringify(approveResponse.body, null, 2));
      throw new Error(`Approval request failed with status ${approveResponse.status}`);
    }

    // Step 4: Validate successful response
    expect(approveResponse.status).toBe(200); // or 201
    
    const bodyApprove = approveResponse.body;
    expect(bodyApprove).toBeDefined();
    
    // Validate that response indicates success if applicable
    if (bodyApprove && typeof bodyApprove === 'object' && bodyApprove.hasOwnProperty('success')) {
      expect(bodyApprove.success).toBe(true);
    }

    console.log(`\nVersion Approved Successfully`);
    console.log('----------------------------------------');
  });

});
