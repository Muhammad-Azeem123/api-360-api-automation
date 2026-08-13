const apiClient = require('../../../utils/apiClient');

/**
 * Reusable module to publish an API Product.
 * 
 * @param {string} projectId - The ID of the project/API Product to publish
 * @returns {Promise<{ success: boolean, data?: Object, error?: string }>} The result summary
 */
async function publishAPIProduct(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  console.log(`[Publish API Product] Fetching project details for ID: ${projectId}...`);
  const getResponse = await apiClient.get(`/portaldev/api/projects/${projectId}`);
  
  if (getResponse.status !== 200) {
    const errorMsg = `Failed to retrieve project details. HTTP Status: ${getResponse.status}. Body: ${JSON.stringify(getResponse.body)}`;
    console.error(`[Publish API Product] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }

  const project = getResponse.body?.data || getResponse.body;
  if (!project) {
    const errorMsg = 'Project details are empty or malformed';
    console.error(`[Publish API Product] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }

  // Map fields for PATCH payload, avoiding read-only or server-generated fields
  const patchPayload = {
    name: project.name,
    name_ar: project.name_ar,
    photo: project.photo,
    description: project.description,
    description_ar: project.description_ar,
    long_description: project.long_description,
    long_description_ar: project.long_description_ar,
    category_id: project.category_id,
    terms_of_use: project.terms_of_use,
    website: project.website,
    health_check: project.health_check,
    published: true,
    requires_kyc_kyb: project.requires_kyc_kyb,
    is_byok_enabled: project.is_byok_enabled,
    license_required: project.license_required,
    license_name: project.license_name,
    prefix: project.prefix,
    pre_req_documents: project.pre_req_documents || [],
    team_id: project.team_id,
    import_data_from: project.import_data_from || 1,
    subscription_expiration_type: project.subscription_expiration_type || "SYSTEM_DEFAULT",
    subscription_expiration_duration_value: project.subscription_expiration_duration_value,
    subscription_expiration_duration_unit: project.subscription_expiration_duration_unit,
    subscription_expiration_specific_date: project.subscription_expiration_specific_date
  };

  console.log(`[Publish API Product] Sending PATCH request to publish project ID: ${projectId}...`);
  const patchResponse = await apiClient.patch(`/portaldev/api/projects/${projectId}`, patchPayload);

  if (patchResponse.status !== 200 && patchResponse.status !== 204) {
    const errorMsg = `Failed to publish project. HTTP Status: ${patchResponse.status}. Body: ${JSON.stringify(patchResponse.body)}`;
    console.error(`[Publish API Product] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }

  console.log(`[Publish API Product] Project ID: ${projectId} published successfully.`);
  return {
    success: true,
    data: patchResponse.body?.data || patchResponse.body
  };
}

module.exports = publishAPIProduct;
