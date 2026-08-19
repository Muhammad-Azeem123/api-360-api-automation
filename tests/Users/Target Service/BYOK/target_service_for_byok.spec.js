const { test, expect } = require('@playwright/test');
const apiClient = require('../../../../utils/apiClient');

/**
 * Creates a Target Service and configures its OAuth Authorization Flow for BYOK.
 *
 * @param {string} projectId - The ID of the project.
 * @param {object} [servicePayloadOverrides] - Overrides for the target service payload.
 * @param {object} [oauthPayloadOverrides] - Overrides for the OAuth config payload.
 * @returns {Promise<{ serviceResponse: object, oauthResponse: object, serviceId: string }>}
 */
async function createTargetServiceWithOAuthConfig(projectId, servicePayloadOverrides = {}, oauthPayloadOverrides = {}) {
  const helperName = 'target_service_for_byok';
  if (!projectId) {
    throw new Error(`[${helperName}] projectId parameter is required.`);
  }

  // Step 1: Create Target Service
  const serviceUrl = `${apiClient.apiPrefix}/services?project_id=${projectId}`;
  const defaultServicePayload = {
    name: "my test service 1",
    retries: 100,
    protocol: "https",
    host: "fakestoreapi.com",
    port: 443,
    connect_timeout: 10000,
    write_timeout: 10000,
    read_timeout: 10000,
    enabled: true,
    environment: "prod",
    service_headers: []
  };
  const servicePayload = { ...defaultServicePayload, ...servicePayloadOverrides };

  console.log(`[${helperName}] [Step 1] Creating Target Service at POST ${serviceUrl} with payload:`, JSON.stringify(servicePayload, null, 2));
  const serviceResponse = await apiClient.post(serviceUrl, servicePayload);
  console.log(`[${helperName}] [Step 1] Response status: ${serviceResponse.status}`);

  if (serviceResponse.status < 200 || serviceResponse.status >= 300) {
    console.error(`[${helperName}] [Step 1] Failed response body:`, JSON.stringify(serviceResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 1] Failed to create Target Service: status ${serviceResponse.status}`);
  }

  expect(serviceResponse.body).toBeDefined();
  const createdService = serviceResponse.body?.data || serviceResponse.body;
  const serviceId = createdService?.id;
  expect(serviceId).toBeDefined();
  console.log(`[${helperName}] [Step 1] Target Service created successfully with ID: ${serviceId}`);

  // Step 2: Configure OAuth Authorization Flow
  const oauthUrl = `${apiClient.apiPrefix}/services/${serviceId}/oauth-config?project_id=${projectId}`;
  const defaultOauthPayload = {
    token_url: "https://fakestoreapi.com/",
    cache_ttl: 300,
    fail_on_error: true,
    http_method: "GET",
    headers: [],
    body: [],
    username: "",
    password: "",
    value_source: "CONSUMER_PROVIDED"
  };
  const oauthPayload = { ...defaultOauthPayload, ...oauthPayloadOverrides };

  console.log(`[${helperName}] [Step 2] Configuring OAuth for service ${serviceId} at POST ${oauthUrl} with payload:`, JSON.stringify(oauthPayload, null, 2));
  const oauthResponse = await apiClient.post(oauthUrl, oauthPayload);
  console.log(`[${helperName}] [Step 2] Response status: ${oauthResponse.status}`);

  if (oauthResponse.status < 200 || oauthResponse.status >= 300) {
    console.error(`[${helperName}] [Step 2] Failed response body:`, JSON.stringify(oauthResponse.body, null, 2));
    throw new Error(`[${helperName}] [Step 2] Failed to configure OAuth for Target Service: status ${oauthResponse.status}`);
  }

  expect(oauthResponse.body).toBeDefined();
  console.log(`[${helperName}] [Step 2] OAuth configuration successfully created and attached.`);

  return {
    serviceResponse,
    oauthResponse,
    serviceId
  };
}

module.exports = createTargetServiceWithOAuthConfig;
