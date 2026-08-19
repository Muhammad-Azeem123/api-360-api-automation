const { expect } = require('@playwright/test');
const apiClient = require('../../../utils/apiClient');

/**
 * Creates a Request-Based pricing plan for the specified project.
 * If a request-based plan already exists, skips creation and returns the existing plan response.
 *
 * @param {string|number} projectId - The ID of the project.
 * @returns {Promise<object>} - The response object of the plan.
 */
async function createRequestBasedPlan(projectId) {
  const helperName = 'plan-base-on-No.-of-request';
  if (!projectId) {
    throw new Error(`[${helperName}] projectId parameter is required.`);
  }

  // Step 1: Verify existing pricing plans
  const getPlansUrl = `${apiClient.apiPrefix}/projects/${projectId}/plans`;
  console.log(`[${helperName}] [Step 1] Fetching existing pricing plans from GET ${getPlansUrl}...`);
  const getPlansResponse = await apiClient.get(getPlansUrl);
  console.log(`[${helperName}] [Step 1] Response status: ${getPlansResponse.status}`);

  if (getPlansResponse.status !== 200) {
    console.error(`[${helperName}] [Step 1] Failed response body:`, JSON.stringify(getPlansResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 1] Failed to verify existing pricing plans: status ${getPlansResponse.status}`);
  }

  expect(getPlansResponse.body).toBeDefined();
  const plans = getPlansResponse.body.data || getPlansResponse.body || [];
  const existingRequestBasedPlan = plans.find(plan => plan.type === 'plan');

  if (existingRequestBasedPlan) {
    console.log(`Request-Based pricing plan already exists.`);
    console.log(`Skipping creation.`);
    return getPlansResponse;
  }

  // Step 2: Fee Preview calculation
  const previewUrl = `${apiClient.apiPrefix}/projects/${projectId}/plans/fee-preview`;
  const previewPayload = {
    type: "plan",
    pricing_segments: [
      {
        segment_name: "S1",
        min_number_of_requests: 1,
        max_number_of_requests: null,
        price_per_request: 50,
        unlimited_requests: true,
        status: "active"
      }
    ]
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
  console.log(`[${helperName}] [Step 2] Fee preview call was successful flock.`);

  // Step 3: Save the actual pricing plan
  // TODO: The complete payload for the Save request below must be completed after inspecting the browser Network tab request.
  // Do NOT invent fields. Ensure the fields match the exact structure captured.
  const saveUrl = `${apiClient.apiPrefix}/projects/${projectId}/plans`;
  const savePayload = {
    type: "plan",
    name: "Request Based Plan 1",
    description: "Request-Based plan created by API Automation",
    payment_type: [
      "prepaid"
    ],
    required_approval: true,
    status: "active",
    has_weights_enabled: false,
    endpoint_weights: [],
    pricing_segments: [
      {
        segment_name: "S1",
        min_number_of_requests: 1,
        max_number_of_requests: null,
        price_per_request: 50,
        unlimited_requests: true,
        status: "active"
      }
    ]
  };

  console.log(`[${helperName}] [Step 3] Saving Request-Based plan at POST ${saveUrl} with payload:`, JSON.stringify(savePayload, null, 2));
  const saveResponse = await apiClient.post(saveUrl, savePayload);
  console.log(`[${helperName}] [Step 3] Response status: ${saveResponse.status}`);

  if (saveResponse.status < 200 || saveResponse.status >= 300) {
    console.error(`[${helperName}] [Step 3] Save plan failed. Response body:`, JSON.stringify(saveResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 3] Save plan request failed with status ${saveResponse.status}`);
  }

  expect(saveResponse.body).toBeDefined();
  expect(saveResponse.body.success).toBe(true);

  console.log(`[${helperName}] [Step 3] Request-Based pricing plan created successfully.`);
  return saveResponse;
}

module.exports = createRequestBasedPlan;
