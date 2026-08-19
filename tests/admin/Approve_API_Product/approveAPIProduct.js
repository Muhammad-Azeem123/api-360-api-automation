const adminApiClient = require('../../../auth/admin/apiClient');

/**
 * Reusable Admin API Product Approval module.
 * 
 * @param {Object} params
 * @param {string} params.productName - The dynamic name of the API Product (Project name)
 * @param {string} params.category - The category name (e.g., 'Test Azy')
 * @returns {Promise<Object>} The approval result summary
 */
async function approveAPIProduct({ productName, category }) {
  console.log(`\n======================================================================`);
  console.log(`[Admin Approval] Starting approval flow for:`);
  console.log(`  Product Name: "${productName}"`);
  console.log(`  Category Name: "${category}"`);
  console.log(`======================================================================`);

  // STEP 1: Get the current pending request count.
  console.log(`[Admin Approval] Step 1: Fetching current pending request count...`);
  const countResponse = await adminApiClient.get('/api/admin/requests/pending/count');
  
  if (countResponse.status < 200 || countResponse.status >= 300) {
    throw new Error(`Failed to fetch pending requests count. HTTP Status: ${countResponse.status}`);
  }
  
  if (!countResponse.body || countResponse.body.success !== true) {
    throw new Error(`Pending count API response indicates failure or is malformed.`);
  }

  const pendingCount = countResponse.body.data;
  console.log(`[Admin Approval] Pending request count retrieved successfully: ${pendingCount}`);

  // STEP 2: Get all admin projects.
  console.log(`[Admin Approval] Step 2: Fetching admin projects (Page 1)...`);
  const projectsResponse = await adminApiClient.get('/api/admin/projects?page=1');
  
  if (projectsResponse.status < 200 || projectsResponse.status >= 300) {
    throw new Error(`Failed to fetch admin projects. HTTP Status: ${projectsResponse.status}`);
  }
  
  const projects = projectsResponse.body?.data;
  if (!projects || !Array.isArray(projects)) {
    throw new Error(`Projects list is missing or invalid in API response.`);
  }
  console.log(`[Admin Approval] Retrieved ${projects.length} projects on page 1.`);

  // STEP 3: Identify the project belonging to the category, and select the MOST RECENT matching project.
  console.log(`[Admin Approval] Step 3: Filtering projects for Name: "${productName}" and Category: "${category}"...`);
  const matchingProjects = projects.filter(proj => {
    const nameMatch = proj.name === productName;
    const catMatch = proj.category && (
      (proj.category.name && proj.category.name.en === category) || 
      (proj.category.name && proj.category.name.ar === category)
    );
    return nameMatch && catMatch;
  });

  if (matchingProjects.length === 0) {
    throw new Error(`Unable to find a pending API project for product '${productName}' and category '${category}'.`);
  }

  // Sort matching projects by created_at descending (most recent first)
  matchingProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const selectedProject = matchingProjects[0];
  const projectId = selectedProject.id;
  if (!projectId) {
    throw new Error(`Matching API project was found, but Project ID is missing.`);
  }
  console.log(`[Admin Approval] Matching project selected:`);
  console.log(`  Name: "${selectedProject.name}"`);
  console.log(`  ID: ${projectId}`);
  console.log(`  Created At: ${selectedProject.created_at}`);
  console.log(`  Status: ${selectedProject.status}`);

  // STEP 4: Get all service providers and find Test_Service_Azy_001.
  console.log(`[Admin Approval] Step 4: Fetching service providers...`);
  const spResponse = await adminApiClient.get('/api/admin/service-providers?per_page=100');
  
  if (spResponse.status < 200 || spResponse.status >= 300) {
    throw new Error(`Failed to fetch service providers. HTTP Status: ${spResponse.status}`);
  }

  const providers = spResponse.body?.data;
  if (!providers || !Array.isArray(providers)) {
    throw new Error(`Service providers list is missing or invalid in API response.`);
  }

  let targetProvider = providers.find(sp => sp.name === 'Test_Service_Azy_001');
  if (!targetProvider) {
    console.warn(`[Admin Approval] Service Provider 'Test_Service_Azy_001' was not found. Falling back to first available provider: '${providers[0]?.name || 'none'}'`);
    targetProvider = providers[0];
  }

  if (!targetProvider) {
    throw new Error(`Service Provider 'Test_Service_Azy_001' was not found, and no other service providers are available.`);
  }

  const serviceProviderId = targetProvider.id;
  if (!serviceProviderId) {
    throw new Error(`Service Provider '${targetProvider.name}' was selected, but ID is missing.`);
  }
  console.log(`[Admin Approval] Target service provider found:`);
  console.log(`  Name: "${targetProvider.name}"`);
  console.log(`  ID: ${serviceProviderId}`);

  // STEP 5: PUT the project with status "accepted".
  console.log(`[Admin Approval] Step 5: Sending approval PUT request for Project ID: ${projectId}...`);
  const putPayload = {
    name: productName,
    status: 'accepted',
    rejection_reason: '',
    service_provider_id: serviceProviderId
  };

  const putResponse = await adminApiClient.put(`/api/admin/projects/${projectId}`, putPayload);
  
  if (putResponse.status < 200 || putResponse.status >= 300) {
    throw new Error(`Failed to approve API Product '${productName}' using Project ID '${projectId}'. HTTP Status: ${putResponse.status}`);
  }

  console.log(`[Admin Approval] PUT response status: ${putResponse.status}`);
  
  // Validate the approval status
  const responseData = putResponse.body?.data || putResponse.body;
  const statusVerified = responseData?.status;
  console.log(`[Admin Approval] Response Status: ${statusVerified}`);

  if (statusVerified && statusVerified !== 'accepted') {
    throw new Error(`Approval succeeded, but returned status is '${statusVerified}' instead of 'accepted'.`);
  }

  console.log(`======================================================================`);
  console.log(`SUCCESS: Admin approval flow completed successfully.`);
  console.log(`======================================================================\n`);

  return {
    projectId,
    productName,
    category,
    serviceProviderId,
    status: 'accepted'
  };
}

module.exports = approveAPIProduct;
