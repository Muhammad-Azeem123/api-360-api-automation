const { test, expect } = require('@playwright/test');
const publishAPIProduct = require('../../Published_module/Published_the_API_Product.spec.js');
const apiClient = require('../../../../utils/apiClient');
const configureEndpointPricingWithoutTier = require('../../pricing-plan/endpoint-pricing-no-tier');
const approveAPIProduct = require('../../../admin/Approve_API_Product/approveAPIProduct');

// Declare variables at the top for ease of customization
const categoryName = 'Test Azy';
const prefixBase = 'apiworkflow';
const pricingPlan = 'Endpoint Pricing - No Tier';
const projectName = `Paid API Product - ${pricingPlan}`;

/**
 * Validates a prefix string against the API URL Prefix rules.
 * 
 * Rules:
 * 1. Only lowercase letters (a-z), numbers (0-9), and hyphens (-) are allowed.
 * 2. Do not allow a hyphen at the beginning of the prefix.
 * 3. Do not allow a hyphen at the end of the prefix.
 * 4. Do not allow consecutive hyphens (--).
 * 5. Do not allow spaces, underscores (_), uppercase letters, or any special characters.
 * 6. The field is required.
 * 
 * @param {string} prefix
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePrefix(prefix) {
  if (!prefix) {
    return { valid: false, message: 'The prefix field is required.' };
  }
  // Rules 1, 5: Check permitted characters. This implicitly rejects spaces, underscores, uppercase, and special chars.
  if (!/^[a-z0-9-]+$/.test(prefix)) {
    return { valid: false, message: 'Only lowercase letters (a-z), numbers (0-9), and hyphens (-) are allowed. No spaces, underscores, uppercase, or special characters.' };
  }
  // Rule 2: Do not allow a hyphen at the beginning
  if (prefix.startsWith('-')) {
    return { valid: false, message: 'Do not allow a hyphen at the beginning of the prefix.' };
  }
  // Rule 3: Do not allow a hyphen at the end
  if (prefix.endsWith('-')) {
    return { valid: false, message: 'Do not allow a hyphen at the end of the prefix.' };
  }
  // Rule 4: Do not allow consecutive hyphens (--)
  if (prefix.includes('--')) {
    return { valid: false, message: 'Do not allow consecutive hyphens (--).' };
  }
  return { valid: true };
}

test.describe('Publish Paid API Product Workflow with Endpoint Pricing - No Tier', () => {

  test('should successfully automate Create and Publish Paid API Product with Endpoint Pricing - No Tier workflow', async () => {
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
      // Note: The /api/lookups/categories route is mapped under lookup type 'category'
      const response = await apiClient.get('/api/lookups/category');

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

      // Verify validation rules on invalid test cases to ensure correct validation behavior
      expect(validatePrefix('').valid).toBe(false); // required
      expect(validatePrefix('-invalid').valid).toBe(false); // leading hyphen
      expect(validatePrefix('invalid-').valid).toBe(false); // trailing hyphen
      expect(validatePrefix('in--valid').valid).toBe(false); // consecutive hyphens
      expect(validatePrefix('in_valid').valid).toBe(false); // underscore
      expect(validatePrefix('Invalid').valid).toBe(false); // uppercase
      expect(validatePrefix('in valid').valid).toBe(false); // spaces
      expect(validatePrefix('invalid$').valid).toBe(false); // special char

      // Generate a dynamic, guaranteed-unique prefix
      prefix = `${prefixBase}-${Date.now()}`;
      console.log(`[Step 2] Generated dynamic prefix: "${prefix}"`);

      // Verify generated prefix satisfies the validation rules
      const valResult = validatePrefix(prefix);
      expect(valResult.valid).toBe(true);

      // Check availability of prefix via GET
      const endpoint = `/api/projects/check-prefix?prefix=${prefix}`;
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
      const response = await apiClient.post('/api/projects', payload);

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

      // Ensure it is clearly printed to console and test reporter
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
    await test.step('GET /api/projects/{projectId} -> Get Project Details', async () => {
      console.log(`[Step 5] Fetching project details for ID: ${projectId}...`);
      const response = await apiClient.get(`/api/projects/${projectId}`);

      console.log(`[Step 5] Response status: ${response.status}`);
      if (response.status !== 200) {
        console.error(`[Step 5] Failed to get project details:`, JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      console.log(`[Step 5] Project details verified successfully.`);
    });

    // Step 6: Verify Existing Endpoints
    await test.step('GET /api/projects/{projectId}/endpoint-pricing/endpoints -> Verify Existing Endpoints', async () => {
      const endpoint = `/api/projects/${projectId}/endpoint-pricing/endpoints`;
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
    await test.step('GET /api/projects/{projectId}/plans -> Verify Existing Pricing Plans', async () => {
      const endpoint = `/api/projects/${projectId}/plans`;
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
    await test.step('GET /api/groups?project_id={projectId} -> Check Existing Groups', async () => {
      const endpoint = `/api/groups?project_id=${projectId}`;
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
    await test.step('POST /api/groups?project_id={projectId} -> Create Group (if missing)', async () => {
      if (groupId) {
        console.log(`[Step 9] Group already exists (ID: ${groupId}). Skipping creation.`);
        return;
      }

      const endpoint = `/api/groups?project_id=${projectId}`;
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

    // Step 10: Create Target Service
    await test.step('POST /api/services?project_id={projectId} -> Create Target Service', async () => {
      const endpoint = `/api/services?project_id=${projectId}`;
      const payload = {
        name: "my test service",
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

      console.log(`[Step 10] Creating Target Service with payload:`, JSON.stringify(payload, null, 2));
      const response = await apiClient.post(endpoint, payload);

      console.log(`[Step 10] Response status: ${response.status}`);
      if (response.status < 200 || response.status >= 300) {
        console.error(`[Step 10] Failed to create Target Service:`, JSON.stringify(response.body, null, 2));
      }
      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();

      const createdService = response.body?.data || response.body;
      serviceId = createdService?.id;
      expect(serviceId).toBeDefined();
      console.log(`[Step 10] Target Service created successfully. Storing serviceId: ${serviceId}`);
    });

    // Step 11: Create Endpoint
    await test.step('POST /api/endpoints?group_id={groupId} -> Create Endpoint', async () => {
      expect(groupId).toBeDefined();
      expect(serviceId).toBeDefined();

      const endpoint = `/api/endpoints?group_id=${groupId}`;
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

    // Configure Endpoint Pricing (No Tier)
    await test.step('Configuring Endpoint Pricing (No Tier)...', async () => {
      expect(projectId).toBeDefined();
      expect(endpointId).toBeDefined();
      console.log(`Configuring Endpoint Pricing (No Tier)...`);
      const planResponse = await configureEndpointPricingWithoutTier(projectId, endpointId);
      expect(planResponse).toBeDefined();
      console.log(`Endpoint Pricing (No Tier) configured successfully.`);
    });

    // Step 12: Get Current Version
    await test.step('GET /api/products/{projectId}/versions?environment=prod -> Get Current Version', async () => {
      const endpoint = `/api/products/${projectId}/versions?environment=prod`;
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
    await test.step('POST /api/vendor/projects/{projectId}/versions/submit -> Submit Version', async () => {
      expect(versionId).toBeDefined();

      const endpoint = `/api/vendor/projects/${projectId}/versions/submit`;
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
    await test.step('POST /api/vendor/projects/{projectId}/versions/{versionId}/publish -> Publish Version', async () => {
      expect(projectId).toBeDefined();
      expect(versionId).toBeDefined();

      const endpoint = `/api/vendor/projects/${projectId}/versions/${versionId}/publish`;
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
    // Step 16: Publish API Product
    await test.step('Publish API Product', async () => {
      expect(projectId).toBeDefined();
      console.log(`[Step 16] Publishing API Product with ID: ${projectId}...\n`);
      const result = await publishAPIProduct(projectId);
      expect(result.success).toBe(true);

      // Verify that published became true
      const getProjectRes = await apiClient.get(`/api/projects/${projectId}`);
      expect(getProjectRes.status).toBe(200);
      const project = getProjectRes.body?.data || getProjectRes.body;
      expect(project.published).toBe(true);
      console.log(`[Step 16] API Product successfully published!\n`);
    });

  });

});
