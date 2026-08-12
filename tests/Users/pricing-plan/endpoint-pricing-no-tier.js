const { expect } = require('@playwright/test');
const apiClient = require('../../../utils/apiClient');

/**
 * Configures endpoint pricing without tiers.
 *
 * @param {string|number} projectId - The ID of the project.
 * @param {string|number} endpointId - The ID of the endpoint.
 * @returns {Promise<object>} - The response object of the endpoint pricing configuration.
 */
async function configureEndpointPricingWithoutTier(projectId, endpointId) {
  const helperName = 'endpoint-pricing-no-tier';
  if (!projectId) {
    throw new Error(`[${helperName}] projectId parameter is required.`);
  }
  if (!endpointId) {
    throw new Error(`[${helperName}] endpointId parameter is required.`);
  }

  // Step 1: Verify endpoint exists
  const endpointsUrl = `/portaldev/api/projects/${projectId}/endpoints`;
  console.log(`[${helperName}] [Step 1] Fetching endpoints from GET ${endpointsUrl}...`);
  const endpointsResponse = await apiClient.get(endpointsUrl);
  console.log(`[${helperName}] [Step 1] Response status: ${endpointsResponse.status}`);

  if (endpointsResponse.status !== 200) {
    console.error(`[${helperName}] [Step 1] Failed response body:`, JSON.stringify(endpointsResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 1] Failed to verify endpoints: status ${endpointsResponse.status}`);
  }

  expect(endpointsResponse.body).toBeDefined();
  const versions = endpointsResponse.body.data || [];
  const endpointExists = versions.some(v =>
    v.endpoints && v.endpoints.some(ep => String(ep.endpoint_id) === String(endpointId) || String(ep.id) === String(endpointId))
  );

  if (!endpointExists) {
    const errorMsg = `Endpoint with ID "${endpointId}" does not exist in project "${projectId}".`;
    console.error(`[${helperName}] [Step 1] Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log(`[${helperName}] [Step 1] Endpoint verification successful. Endpoint ID ${endpointId} exists.`);

  // Step 2: Enable Endpoint Pricing
  const updateSettingsUrl = `/portaldev/api/projects/${projectId}/update-endpoint-pricing-settings`;
  const settingsPayload = {
    enable_endpoint_pricing: true
  };

  console.log(`[${helperName}] [Step 2] Enabling endpoint pricing at PATCH ${updateSettingsUrl} with payload:`, JSON.stringify(settingsPayload, null, 2));
  const settingsResponse = await apiClient.patch(updateSettingsUrl, settingsPayload);
  console.log(`[${helperName}] [Step 2] Response status: ${settingsResponse.status}`);

  if (settingsResponse.status < 200 || settingsResponse.status >= 300) {
    console.error(`[${helperName}] [Step 2] Update endpoint pricing settings failed. Response body:`, JSON.stringify(settingsResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 2] Update settings failed with status ${settingsResponse.status}`);
  }

  expect(settingsResponse.body).toBeDefined();
  if (settingsResponse.body && typeof settingsResponse.body === 'object' && settingsResponse.body.hasOwnProperty('success')) {
    expect(settingsResponse.body.success).toBe(true);
  }
  console.log(`[${helperName}] [Step 2] Endpoint pricing enabled successfully.`);

  // Step 3: Configure Endpoint Pricing (Without Tier)
  const configurePricingUrl = `/portaldev/api/projects/${projectId}/endpoint-pricing/${endpointId}`;
  const pricingPayload = {
    failure_price: "2",
    endpoint_version_number: 1,
    is_monetized: true,
    is_tier: false,
    tiers: [],
    success_price: 10
  };

  console.log(`[${helperName}] [Step 3] Configuring endpoint pricing at POST ${configurePricingUrl} with payload:`, JSON.stringify(pricingPayload, null, 2));
  const pricingResponse = await apiClient.post(configurePricingUrl, pricingPayload);
  console.log(`[${helperName}] [Step 3] Response status: ${pricingResponse.status}`);

  if (pricingResponse.status < 200 || pricingResponse.status >= 300) {
    console.error(`[${helperName}] [Step 3] Configure endpoint pricing failed. Response body:`, JSON.stringify(pricingResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 3] Configure endpoint pricing failed with status ${pricingResponse.status}`);
  }

  expect(pricingResponse.body).toBeDefined();
  if (pricingResponse.body && typeof pricingResponse.body === 'object' && pricingResponse.body.hasOwnProperty('success')) {
    expect(pricingResponse.body.success).toBe(true);
  }

  console.log(`[${helperName}] [Step 3] Endpoint pricing (without tier) configured successfully.`);
  return pricingResponse;
}

module.exports = configureEndpointPricingWithoutTier;
