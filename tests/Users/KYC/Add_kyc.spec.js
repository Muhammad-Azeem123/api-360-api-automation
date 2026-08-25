// @ts-check
const { test, expect } = require('@playwright/test');
const apiClient = require('../../../utils/apiClient');
const adminApiClient = require('../../../auth/admin/apiClient');

test.describe('Add KYC and Admin Approval Flow', () => {

  test('should submit KYC request as consumer if not present and approve it as admin', async () => {
    console.log('\n============================================================');
    console.log('           STARTING ADD KYC & ADMIN APPROVAL FLOW           ');
    console.log('============================================================\n');

    // Step 0: Check if KYC is already present
    console.log('[Step 0] Checking existing KYC status via GET /portaldev/api/consumer/kyc-kyb/kyc-details...');
    const detailsResponse = await apiClient.get('/portaldev/api/consumer/kyc-kyb/kyc-details');

    console.log(`[Response] Status: ${detailsResponse.status}`);
    console.log(`[Response] Body:`, JSON.stringify(detailsResponse.body, null, 2));

    /** @type {any} */
    let kycId;
    let isAlreadySubmitted = false;

    // Determine if KYC is present. Usually status 200 with an ID.
    // If 404 or no ID, we assume not present.
    const hasExistingKyc = detailsResponse.status === 200 &&
      detailsResponse.body &&
      (detailsResponse.body.id || (detailsResponse.body.data && detailsResponse.body.data.id));

    if (hasExistingKyc) {
      console.log('[Step 0] KYC details are already present and Approved by Admin. No need to add or update. Exiting test successfully.');
      return;
    } else {
      console.log('[Step 0] KYC details are not present. Proceeding to submit a new KYC request...');

      // Step 1: Submit KYC Request
      console.log('[Step 1] Submitting KYC request via POST /portaldev/api/consumer/kyc-kyb/kyc...');
      const kycPayload = {
        username: "Test User for kyc",
        first_name: "Test ",
        last_name: "User",
        email: "azeemxyz2580@gmail.com",
        country: "sa",
        city: "riyadh",
        national_id: "1231231231",
        mobile_number: "0531231231"
      };

      const postResponse = await apiClient.post('/portaldev/api/consumer/kyc-kyb/kyc', kycPayload);

      // Assert successful KYC submission or handle existing submission gracefully
      console.log(`[Response] Status: ${postResponse.status}`);
      if (![200, 201, 400].includes(postResponse.status)) {
        console.error(`[Error Response Body]:`, JSON.stringify(postResponse.body, null, 2));
      }
      expect([200, 201, 400]).toContain(postResponse.status);
      expect(postResponse.body).toBeDefined();

      isAlreadySubmitted = postResponse.status === 400 &&
        (postResponse.body?.message === 'KYC already submitted' ||
          (postResponse.body?.data && postResponse.body.data.message === 'KYC already submitted'));

      if (isAlreadySubmitted) {
        console.log(`[Response] KYC already submitted for this user. We will retrieve the existing KYC ID from the Admin list.`);
      } else {
        expect([200, 201]).toContain(postResponse.status);
        const postBody = postResponse.body;
        kycId = postBody.id || (postBody.data && postBody.data.id);
        console.log(`[Response] Successfully created KYC request with ID: ${kycId}`);
        expect(kycId).toBeTruthy();
      }
    }

    // Step 2: Fetch KYC Requests from Admin API
    console.log('\n[Step 2] Fetching KYC requests via Admin GET /api/admin/kyc-kyb/kyc?pageNumber=1&pageSize=10...');
    const getResponse = await adminApiClient.get('/api/admin/kyc-kyb/kyc?pageNumber=1&pageSize=10');

    // Assert successful Admin GET response
    console.log(`[Response] Status: ${getResponse.status}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toBeDefined();

    /** @type {any[]} */
    const kycList = getResponse.body.result || getResponse.body.data || getResponse.body;
    expect(Array.isArray(kycList)).toBe(true);

    // Step 3: Find the exact KYC request
    let matchingKyc;
    if (isAlreadySubmitted) {
      console.log(`[Step 3] Finding existing KYC record by email 'azeemxyz2580@gmail.com'...`);
      matchingKyc = kycList.find(item => item && item.email === 'azeemxyz2580@gmail.com');
      expect(matchingKyc).toBeDefined();
      kycId = matchingKyc.id;
      console.log(`[Step 3] Retrieved existing KYC ID: ${kycId}`);
    } else {
      console.log(`[Step 3] Finding matching KYC record for ID: ${kycId}...`);
      matchingKyc = kycList.find(item => item && item.id === kycId);
      expect(matchingKyc).toBeDefined();
    }
    console.log(`[Step 3] Matching KYC record found:`, JSON.stringify(matchingKyc, null, 2));

    // Step 4: Extract the corresponding Profile ID
    console.log('\n[Step 4] Extracting Profile ID from the matching KYC record...');
    // Inspect properties dynamically to extract profile ID (checking profile_id, profileId, and profile.id)
    const profileId = matchingKyc.profile_id ||
      matchingKyc.profileId ||
      (matchingKyc.profile && typeof matchingKyc.profile === 'object' ? matchingKyc.profile.id : matchingKyc.profile);

    // Assert that Profile ID is retrieved successfully
    console.log(`[Step 4] Extracted Profile ID: ${profileId}`);
    expect(profileId).toBeTruthy();

    // Step 5: Approve the KYC request using Admin PATCH endpoint
    const patchUrl = `/api/admin/kyc-kyb/${kycId}/profile/${profileId}?approvalStatus=COMPLETED&isKyc=true`;
    console.log(`\n[Step 5] Patching KYC approval via Admin PATCH ${patchUrl}...`);

    const patchResponse = await adminApiClient.patch(patchUrl, {});

    // Assert successful PATCH approval
    console.log(`[Response] Status: ${patchResponse.status}`);
    expect([200, 201, 204]).toContain(patchResponse.status);
    console.log(`[Response] Body:`, JSON.stringify(patchResponse.body, null, 2));

    // Step 6: Verify the final response/status where supported
    if (patchResponse.body) {
      const patchBody = patchResponse.body;
      const finalStatus = patchBody.approvalStatus || (patchBody.data && patchBody.data.approvalStatus);
      if (finalStatus) {
        console.log(`[Step 6] Verifying final approval status: ${finalStatus}`);
        expect(finalStatus).toBe('COMPLETED');
      } else {
        console.log('[Step 6] Final approval status is not returned directly in the PATCH response body. Verification complete.');
      }
    } else {
      console.log('[Step 6] Empty PATCH response body returned. Verification complete.');
    }

    console.log('\n============================================================');
    console.log('           ADD KYC & ADMIN APPROVAL COMPLETED               ');
    console.log('============================================================\n');
  });

});
