const { test, expect } = require('@playwright/test');
const apiClient = require('../../../../utils/apiClient');
const createTargetServiceWithOAuthConfig = require('../../Target Service/BYOK/target_service_for_byok.spec');
const configureEndpointPricingWithTier = require('../../pricing-plan/endpoint-pricing-tier');
const approveAPIProduct = require('../../../admin/Approve_API_Product/approveAPIProduct');

// Declare variables at the top for ease of customization
const categoryName = 'Test Azy';
const prefixBase = 'apiworkflow';
const pricingPlan = 'Endpoint Pricing - Tier';
const projectName = `Paid BYOK Product - ${pricingPlan}`;

/**
 * Validates a prefix string against the API URL Prefix rules.
 */
function validatePrefix(prefix) {
  if (!prefix) {
    return { valid: false, message: 'The prefix field is required.' };
  }
  if (!/^[a-z0-9-]+$/.test(prefix)) {
    return { valid: false, message: 'Only lowercase letters (a-z), numbers (0-9), and hyphens (-) are allowed. No spaces, underscores, uppercase, or special characters.' };
  }
  if (prefix.startsWith('-')) {
    return { valid: false, message: 'Do not allow a hyphen at the beginning of the prefix.' };
  }
  if (prefix.endsWith('-')) {
    return { valid: false, message: 'Do not allow a hyphen at the end of the prefix.' };
  }
  if (prefix.includes('--')) {
    return { valid: false, message: 'Do not allow consecutive hyphens (--).' };
  }
  return { valid: true };
}

test.describe('Create Paid BYOK API Product Workflow with Endpoint Pricing - Tier', () => {

  test('should successfully automate Create Paid BYOK API Product with Endpoint Pricing - Tier workflow', async () => {
    let categoryId;
    let prefix;
    let projectId;
    let groupId;
    let serviceId;
    let endpointId;
    let versionId;
    let versionNumber;
    let uniqueProjectName;

    // Step 1: Fetch lookup categories
    await test.step('GET /api/lookups/categories -> Fetch lookup categories', async () => {
      console.log(`[Step 1] Fetching lookup categories...`);
      const response = await apiClient.get('/portaldev/api/lookups/category');

      console.log(`[Step 1] Response status: ${response.status}`);
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const categories = response.body?.data || response.body || [];
      expect(Array.isArray(categories)).toBe(true);

      const targetCategory = categories.find(cat => cat.name === categoryName);
      if (!targetCategory) {
        const errorMsg = `Category with name "${categoryName}" was not found in lookups.`;
        console.error(`[Step 1] Error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      categoryId = targetCategory.id;
      console.log(`[Step 1] Found category "${categoryName}" with ID: ${categoryId}`);
      expect(categoryId).toBeDefined();
    });

    // Step 2: Validate prefix validation rules and check prefix availability
    await test.step('GET /api/projects/check-prefix -> Generate & validate prefix', async () => {
      console.log(`[Step 2] Testing prefix validation helper against rules...`);

      expect(validatePrefix('').valid).toBe(false);
      expect(validatePrefix('-invalid').valid).toBe(false);
      expect(validatePrefix('invalid-').valid).toBe(false);
      expect(validatePrefix('in--valid').valid).toBe(false);
      expect(validatePrefix('in_valid').valid).toBe(false);
      expect(validatePrefix('Invalid').valid).toBe(false);
      expect(validatePrefix('in valid').valid).toBe(false);
      expect(validatePrefix('invalid$').valid).toBe(false);

      prefix = `${prefixBase}-${Date.now()}`;
      console.log(`[Step 2] Generated dynamic prefix: "${prefix}"`);

      const valResult = validatePrefix(prefix);
      expect(valResult.valid).toBe(true);

      const endpoint = `/portaldev/api/projects/check-prefix?prefix=${prefix}`;
      console.log(`[Step 2] Calling GET ${endpoint}...`);
      const response = await apiClient.get(endpoint);

      console.log(`[Step 2] Response status: ${response.status}`);
      if (response.status !== 200) {
        console.error(`[Step 2] Check prefix failed:`, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.available).toBe(true);
      console.log(`[Step 2] Prefix "${prefix}" is available for use.`);
    });

    // Step 3: Create a new project
    await test.step('POST /api/projects -> Create new project', async () => {
      expect(categoryId).toBeDefined();
      expect(prefix).toBeDefined();

      uniqueProjectName = `${projectName} ${Date.now()}`;
      const payload = {
        name: uniqueProjectName,
        name_ar: uniqueProjectName,
        description: "this is the latest description of this API Product",
        category_id: categoryId,
        team_id: 1,
        import_data_from: 1,
        prefix: prefix
      };

      console.log(`[Step 3] Creating project with payload:`, JSON.stringify(payload, null, 2));
      const response = await apiClient.post('/portaldev/api/projects', payload);

      console.log(`[Step 3] Response status: ${response.status}`);
      if (response.status !== 201) {
        console.error(`[Step 3] Failed response body:`, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      projectId = response.body.data.id;
      expect(projectId).toBeDefined();
      console.log(`[Step 3] Project created successfully. Response Body:`, JSON.stringify(response.body, null, 2));
    });

    // Step 4: Log projectId and response details clearly for subsequent runs
    await test.step('Log Project details', async () => {
      console.log(`\n======================================================================`);
      console.log(`SUCCESS: Create API Product Workflow automated successfully.`);
      console.log(`Generated Prefix: ${prefix}`);
      console.log(`Selected Category: ${categoryName} (ID: ${categoryId})`);
      console.log(`Created Project ID: ${projectId}`);
      console.log(`======================================================================\n`);

    });

    // Step 4.5: Admin Approval -> Approve the API Product
    await test.step('Admin Approval -> Approve the API Product', async () => {
      console.log(`[Step 4.5] Approving API Product "${uniqueProjectName}" under category "${categoryName}"...`);
      const approvalResult = await approveAPIProduct({
        productName: uniqueProjectName,
        category: categoryName
      });
      expect(approvalResult).toBeDefined();
      expect(approvalResult.status).toBe('accepted');
      console.log(`[Step 4.5] API Product "${uniqueProjectName}" approved and accepted successfully.`);
    });

    // Step 5: Get Project Details
    await test.step('GET /portaldev/api/projects/{projectId} -> Get Project Details', async () => {
      console.log(`[Step 5] Fetching project details for ID: ${projectId}...`);
      const response = await apiClient.get(`/portaldev/api/projects/${projectId}`);

      console.log(`[Step 5] Response status: ${response.status}`);
      if (response.status !== 200) {
        console.error(`[Step 5] Failed to get project details:`, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      console.log(`[Step 5] Project details verified successfully.`);
    });

    // Step 6: Verify Existing Endpoints
    await test.step('GET /portaldev/api/projects/{projectId}/endpoint-pricing/endpoints -> Verify Existing Endpoints', async () => {
      const endpoint = `/portaldev/api/projects/${projectId}/endpoint-pricing/endpoints`;
      console.log(`[Step 6] Verifying existing endpoints...`);
      const response = await apiClient.get(endpoint);

      console.log(`[Step 6] Response status: ${response.status}`);
      if (response.status !== 200) {
        console.error(`[Step 6] Failed to verify endpoints:`, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const endpoints = response.body?.data || response.body || [];
      if (endpoints.length > 0) {
        console.log(`[Step 6] Endpoints already exist (Count: ${endpoints.length}).`);
      } else {
        console.log(`[Step 6] No existing endpoints found.`);
      }
    });

    // Step 7: Verify Existing Pricing Plans
    await test.step('GET /portaldev/api/projects/{projectId}/plans -> Verify Existing Pricing Plans', async () => {
      const endpoint = `/portaldev/api/projects/${projectId}/plans`;
      console.log(`[Step 7] Verifying existing pricing plans...`);
      const response = await apiClient.get(endpoint);

      console.log(`[Step 7] Response status: ${response.status}`);
      if (response.status !== 200) {
        console.error(`[Step 7] Failed to verify pricing plans:`, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const plans = response.body?.data || response.body || [];
      if (plans.length > 0) {
        console.log(`[Step 7] Pricing plans already exist (Count: ${plans.length}).`);
      } else {
        console.log(`[Step 7] No pricing plans exist.`);
      }
    });

    // Step 8: Check Existing Groups
    await test.step('GET /portaldev/api/groups?project_id={projectId} -> Check Existing Groups', async () => {
      const endpoint = `/portaldev/api/groups?project_id=${projectId}`;
      console.log(`[Step 8] Checking existing groups for project...`);
      const response = await apiClient.get(endpoint);

      console.log(`[Step 8] Response status: ${response.status}`);
      if (response.status !== 200) {
        console.error(`[Step 8] Failed to check groups:`, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const groups = response.body?.data || response.body || [];
      if (groups.length > 0) {
        groupId = groups[0].id;
        console.log(`[Step 8] Found existing group. Storing groupId: ${groupId}`);
      } else {
        console.log(`[Step 8] No existing groups found.`);
      }
    });

    // Step 9: Create Group (Only When Needed)
    await test.step('POST /portaldev/api/groups?project_id={projectId} -> Create Group (if missing)', async () => {
      if (groupId) {
        console.log(`[Step 9] Group already exists (ID: ${groupId}). Skipping creation.`);
        return;
      }

      const endpoint = `/portaldev/api/groups?project_id=${projectId}`;
      const payload = {
        name: "Test Group 1",
        description: "description of API Automation",
        external_doc_url: "",
        external_doc_description: ""
      };

      console.log(`[Step 9] Creating group with payload:`, JSON.stringify(payload, null, 2));
      const response = await apiClient.post(endpoint, payload);

      console.log(`[Step 9] Response status: ${response.status}`);
      if (response.status < 200 || response.status >= 300) {
        console.error(`[Step 9] Failed to create group:`, JSON.stringify(response.body, null, 2));
      }
      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();

      const createdGroup = response.body?.data || response.body;
      groupId = createdGroup?.id;
      expect(groupId).toBeDefined();
      console.log(`[Step 9] Group created successfully. Storing groupId: ${groupId}`);
    });

    // Step 10: Create Target Service & Configure OAuth Flow using the target_service_for_byok module
    await test.step('Create Target Service for BYOK (target_service_for_byok)', async () => {
      expect(projectId).toBeDefined();

      const uniqueServiceName = `my test service ${Date.now()}`;
      console.log(`[Step 10] Calling target_service_for_byok helper module for project ${projectId} with name: ${uniqueServiceName}`);
      
      const result = await createTargetServiceWithOAuthConfig(projectId, { name: uniqueServiceName });
      serviceId = result.serviceId;

      expect(serviceId).toBeDefined();
      console.log(`[Step 10] BYOK Target Service created and OAuth configured successfully. Storing serviceId: ${serviceId}`);
    });

    // Step 10.5: Send PATCH /portaldev/api/projects/{projectId} -> Update with is_byok_enabled = true
    await test.step('PATCH /portaldev/api/projects/{projectId} -> Enable BYOK', async () => {
      expect(projectId).toBeDefined();

      const endpoint = `/portaldev/api/projects/${projectId}`;
      const payload = {
        name: uniqueProjectName,
        name_ar: uniqueProjectName,
        photo: null,
        description: "this is the latest description of this API Product",
        description_ar: "",
        long_description: null,
        long_description_ar: "",
        category_id: categoryId,
        terms_of_use: null,
        website: null,
        health_check: null,
        published: false,
        requires_kyc_kyb: false,
        is_byok_enabled: true,
        license_required: false,
        license_name: null,
        prefix: prefix,
        pre_req_documents: [],
        team_id: 1,
        import_data_from: 1,
        subscription_expiration_type: "SYSTEM_DEFAULT",
        subscription_expiration_duration_value: null,
        subscription_expiration_duration_unit: null,
        subscription_expiration_specific_date: null
      };

      console.log(`[Step 10.5] Enabling BYOK for project ${projectId} with payload:`, JSON.stringify(payload, null, 2));
      const response = await apiClient.patch(endpoint, payload);

      console.log(`[Step 10.5] Response status: ${response.status}`);
      if (response.status < 200 || response.status >= 300) {
        console.error(`[Step 10.5] Failed to enable BYOK on project:`, JSON.stringify(response.body, null, 2));
      }
      expect([200, 204]).toContain(response.status);
      expect(response.body).toBeDefined();
      console.log(`[Step 10.5] BYOK successfully enabled on project.`);
    });

    // Step 11: Create Endpoint
    await test.step('POST /portaldev/api/endpoints?group_id={groupId} -> Create Endpoint', async () => {
      expect(groupId).toBeDefined();
      expect(serviceId).toBeDefined();

      const endpoint = `/portaldev/api/endpoints?group_id=${groupId}`;
      const payload = {
        name: "Test_Endpoint_for_API_Automation",
        description: "Test_Endpoint_for_API_Automation",
        path: "/users",
        http_method: "GET",
        external_doc_url: "",
        external_doc_description: "",
        headers: [],
        params: [],
        body: [],
        service_id: serviceId,
        callback_enabled: false,
        environment: "prod",
        backend_path: "/users",
        example_responses: []
      };

      console.log(`[Step 11] Creating Endpoint with payload:`, JSON.stringify(payload, null, 2));
      const response = await apiClient.post(endpoint, payload);

      console.log(`[Step 11] Response status: ${response.status}`);
      if (response.status < 200 || response.status >= 300) {
        console.error(`[Step 11] Failed to create Endpoint:`, JSON.stringify(response.body, null, 2));
      }
      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();

      const createdEndpoint = response.body?.data || response.body;
      endpointId = createdEndpoint?.id;
      expect(endpointId).toBeDefined();
      console.log(`[Step 11] Endpoint created successfully. Storing endpointId: ${endpointId}`);
    });

    // Step 11.5: Configure Endpoint Pricing (Tier)
    await test.step('Configuring Endpoint Pricing (Tier)...', async () => {
      expect(projectId).toBeDefined();
      expect(endpointId).toBeDefined();
      console.log(`[Step 11.5] Configuring Endpoint Pricing (Tier)...`);
      const planResponse = await configureEndpointPricingWithTier(projectId, endpointId);
      expect(planResponse).toBeDefined();
      console.log(`[Step 11.5] Endpoint Pricing (Tier) configured successfully.`);
    });

    // Step 12: Get Current Version
    await test.step('GET /portaldev/api/products/{projectId}/versions?environment=prod -> Get Current Version', async () => {
      const endpoint = `/portaldev/api/products/${projectId}/versions?environment=prod`;
      console.log(`[Step 12] Fetching current versions for project...`);
      const response = await apiClient.get(endpoint);

      console.log(`[Step 12] Response status: ${response.status}`);
      if (response.status !== 200) {
        console.error(`[Step 12] Failed to get current version:`, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const versions = response.body?.data || response.body || [];
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);

      const currentVersion = versions[0];
      versionId = currentVersion?.id;
      versionNumber = currentVersion?.version_number;

      expect(versionId).toBeDefined();
      console.log(`[Step 12] Found current version. ID: ${versionId}, Version Number: ${versionNumber}`);
    });

    // Step 13: Submit Version
    await test.step('POST /portaldev/api/vendor/projects/{projectId}/versions/submit -> Submit Version', async () => {
      expect(versionId).toBeDefined();

      const endpoint = `/portaldev/api/vendor/projects/${projectId}/versions/submit`;
      const payload = {
        version_id: versionId
      };

      console.log(`[Step 13] Submitting version with payload:`, JSON.stringify(payload, null, 2));
      const response = await apiClient.post(endpoint, payload);

      console.log(`[Step 13] Response status: ${response.status}`);
      if (response.status < 200 || response.status >= 300) {
        console.error(`[Step 13] Failed to submit version:`, JSON.stringify(response.body, null, 2));
      }
      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();
      console.log(`[Step 13] Version submitted successfully.`);
    });

    // Step 14: Run Admin Approval Test
    await test.step('Run Admin Approval Test (approve-api.spec.js)', async () => {
      console.log(`[Step 14] Executing existing approve-api.spec.js test suite via child process...`);
      const { execSync } = require('child_process');
      try {
        const output = execSync('npx playwright test tests/admin/approve-api/approve-api.spec.js', {
          env: { ...process.env, SKIP_GLOBAL_SETUP: 'true' },
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        console.log(`[Step 14] Admin approval test executed successfully. Output:\n`, output);
      } catch (error) {
        console.error(`[Step 14] Admin approval test execution failed:`, error.message);
        if (error.stdout) console.log(`stdout:`, error.stdout);
        if (error.stderr) console.error(`stderr:`, error.stderr);
        throw error;
      }
    });

    // Step 15: Publish Version
    await test.step('POST /portaldev/api/vendor/projects/{projectId}/versions/{versionId}/publish -> Publish Version', async () => {
      expect(projectId).toBeDefined();
      expect(versionId).toBeDefined();

      const endpoint = `/portaldev/api/vendor/projects/${projectId}/versions/${versionId}/publish`;
      console.log(`[Step 15] Publishing version... Calling POST ${endpoint}`);
      const response = await apiClient.post(endpoint, {});

      console.log(`[Step 15] Response status: ${response.status}`);
      if (response.status < 200 || response.status >= 300) {
        console.error(`[Step 15] Failed to publish version:`, JSON.stringify(response.body, null, 2));
      }
      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();

      const bodyPublish = response.body;
      if (bodyPublish && typeof bodyPublish === 'object' && bodyPublish.hasOwnProperty('success')) {
        expect(bodyPublish.success).toBe(true);
      }
      console.log(`[Step 15] Version published successfully.`);
    });

  });

});
