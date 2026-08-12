const { expect } = require('@playwright/test');
const apiClient = require('../../../utils/apiClient');

/**
 * Creates a Package pricing plan for the specified project.
 * If a package plan already exists, skips creation and returns the existing plan response.
 *
 * @param {string|number} projectId - The ID of the project.
 * @returns {Promise<object>} - The response object of the plan.
 */
async function createPackagePlan(projectId) {
  const helperName = 'plan-as-a-package';
  if (!projectId) {
    throw new Error(`[${helperName}] projectId parameter is required.`);
  }

  // Step 1: Verify whether a Package pricing plan already exists
  const getPlansUrl = `/portaldev/api/projects/${projectId}/plans`;
  console.log(`[${helperName}] [Step 1] Fetching existing pricing plans from GET ${getPlansUrl}...`);
  const getPlansResponse = await apiClient.get(getPlansUrl);
  console.log(`[${helperName}] [Step 1] Response status: ${getPlansResponse.status}`);

  if (getPlansResponse.status !== 200) {
    console.error(`[${helperName}] [Step 1] Failed response body:`, JSON.stringify(getPlansResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 1] Failed to verify existing pricing plans: status ${getPlansResponse.status}`);
  }

  expect(getPlansResponse.body).toBeDefined();
  const plans = getPlansResponse.body.data || getPlansResponse.body || [];
  const existingPackagePlan = plans.find(plan => plan.type === 'package');

  if (existingPackagePlan) {
    console.log(`Package pricing plan already exists.`);
    console.log(`Skipping creation.`);
    return getPlansResponse;
  }

  // Step 2: Fee Preview calculation
  const previewUrl = `/portaldev/api/projects/${projectId}/plans/fee-preview`;
  const previewPayload = {
    type: "package",
    number_of_requests: 1000,
    package_price: 300,
    pricing_segments: []
  };

  console.log(`[${helperName}] [Step 2] Call Fee Preview at POST ${previewUrl} with payload:`, JSON.stringify(previewPayload, null, 2));
  const previewResponse = await apiClient.post(previewUrl, previewPayload);
  console.log(`[${helperName}] [Step 2] Response status: ${previewResponse.status}`);

  if (previewResponse.status < 200 || previewResponse.status >= 300) {
    console.error(`[${helperName}] [Step 2] Fee preview failed. Response body:`, JSON.stringify(previewResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 2] Fee preview failed with status ${previewResponse.status}`);
  }

  expect(previewResponse.body).toBeDefined();
  expect(previewResponse.body.success).toBe(true);

  const previewBody = previewResponse.body;
  const feePercentage = previewBody.fee_percentage !== undefined ? previewBody.fee_percentage : (previewBody.data?.fee_percentage);
  const feeAmount = previewBody.fee_amount !== undefined ? previewBody.fee_amount : (previewBody.data?.fee_amount);
  const vendorPayout = previewBody.vendor_payout !== undefined ? previewBody.vendor_payout : (previewBody.data?.vendor_payout);
  const pricePerRequest = previewBody.price_per_request !== undefined ? previewBody.price_per_request : (previewBody.data?.price_per_request);

  console.log(`[${helperName}] [Step 2] Calculated values:`);
  console.log(`- Fee Percentage: ${feePercentage}`);
  console.log(`- Fee Amount: ${feeAmount}`);
  console.log(`- Vendor Payout: ${vendorPayout}`);
  console.log(`- Price Per Request: ${pricePerRequest}`);

  // Step 3: Save the actual pricing plan
  const saveUrl = `/portaldev/api/projects/${projectId}/plans`;
  const savePayload = {
    type: "package",
    name: "Package 1",
    description: "Package created by API Automation",
    payment_type: [
      "prepaid"
    ],
    required_approval: true,
    number_of_requests: "1000",
    package_price: "123",
    price_per_request: "0.12",
    status: "active",
    has_weights_enabled: false,
    endpoint_weights: []
  };

  console.log(`[${helperName}] [Step 3] Saving Package plan at POST ${saveUrl} with payload:`, JSON.stringify(savePayload, null, 2));
  const saveResponse = await apiClient.post(saveUrl, savePayload);
  console.log(`[${helperName}] [Step 3] Response status: ${saveResponse.status}`);

  if (saveResponse.status < 200 || saveResponse.status >= 300) {
    console.error(`[${helperName}] [Step 3] Save plan failed. Response body:`, JSON.stringify(saveResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 3] Save plan request failed with status ${saveResponse.status}`);
  }

  expect(saveResponse.body).toBeDefined();
  expect(saveResponse.body.success).toBe(true);

  console.log(`[${helperName}] [Step 3] Package pricing plan created successfully.`);
  return saveResponse;
}

module.exports = createPackagePlan;
