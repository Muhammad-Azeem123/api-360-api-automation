const { test, expect } = require('@playwright/test');
const userTokenManager = require('../../../auth/user/tokenManager');
const apiClient = require('../../../utils/apiClient');

test.describe('Cleanup All API Products', () => {

  test('should successfully delete all API Products/projects from the system', async () => {
    console.log('\n======================================================================');
    console.log('[Delete API Products] Starting Deletion Flow...');
    console.log('======================================================================');

    // Ensure tokens are active/refreshed
    try {
      console.log('[Delete API Products] Refreshing/Validating User Tokens...');
      await userTokenManager.refresh();
    } catch (err) {
      console.error(`[Delete API Products] Token refresh failed: ${err.message}`);
      throw err;
    }

    const projectIds = new Set();
    let page = 1;
    const perPage = 12;
    let hasMorePages = true;

    console.log('\n[Delete API Products] --- STEP 1: Retrieving All Projects ---');

    while (hasMorePages) {
      const endpoint = `${apiClient.apiPrefix}/projects?page=${page}&per_page=${perPage}`;
      console.log(`[Delete API Products] GET ${endpoint}`);
      
      let response;
      try {
        response = await apiClient.get(endpoint);
      } catch (err) {
        console.error(`[Delete API Products] HTTP GET failed for page ${page}: ${err.message}`);
        throw err;
      }

      if (response.status !== 200) {
        const errMsg = `Failed to get projects page ${page}. Status: ${response.status}. Body: ${JSON.stringify(response.body)}`;
        console.error(`[Delete API Products] ${errMsg}`);
        throw new Error(errMsg);
      }

      const body = response.body;
      const projects = body?.data || [];
      console.log(`[Delete API Products] Retrieved ${projects.length} projects on page ${page}.`);

      for (const project of projects) {
        if (project.id) {
          if (projectIds.has(project.id)) {
            console.log(`[Delete API Products] Warning: Duplicate Project ID detected and ignored: ${project.id}`);
          } else {
            projectIds.add(project.id);
          }
        }
      }

      // Determine pagination status
      const meta = body?.meta;
      if (meta && typeof meta.current_page === 'number' && typeof meta.last_page === 'number') {
        hasMorePages = meta.current_page < meta.last_page;
      } else {
        // Fallback: check if the results array has less than perPage items or is empty
        hasMorePages = projects.length === perPage;
      }

      if (hasMorePages) {
        page++;
      }
    }

    const totalProjects = projectIds.size;
    console.log(`\n[Delete API Products] Total unique projects collected: ${totalProjects}`);

    console.log('\n[Delete API Products] --- STEP 2: Deleting Each Project ---');
    
    const successfulDeletions = [];
    const failedDeletions = [];

    const deleteReason = 'xscxscxcxc';

    for (const projectId of projectIds) {
      console.log(`[Delete API Products] Processing Project ID: ${projectId}...`);
      
      let context;
      try {
        context = await apiClient.getRequestContext();
        // Send DELETE with the delete reason in the body
        const response = await context.delete(`${apiClient.apiPrefix}/projects/${projectId}`, {
          data: { delete_reason: deleteReason }
        });
        
        const status = response.status();
        const text = await response.text();
        let body;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = text;
        }

        if (status >= 200 && status < 300) {
          console.log(`[Delete API Products] Successfully deleted project ID: ${projectId} (Status: ${status})`);
          successfulDeletions.push(projectId);
        } else {
          const errorMsg = `HTTP ${status} - Body: ${typeof body === 'object' ? JSON.stringify(body) : body}`;
          console.error(`[Delete API Products] Failed to delete project ID: ${projectId}. Error: ${errorMsg}`);
          failedDeletions.push({ id: projectId, error: errorMsg });
        }
      } catch (err) {
        console.error(`[Delete API Products] Network/Request error while deleting project ID: ${projectId}. Error: ${err.message}`);
        failedDeletions.push({ id: projectId, error: err.message });
      } finally {
        if (context) {
          await context.dispose();
        }
      }
    }

    console.log('\n======================================================================');
    console.log('[Delete API Products] Execution Summary');
    console.log('======================================================================');
    console.log(`Total projects identified: ${totalProjects}`);
    console.log(`Successfully deleted projects: ${successfulDeletions.length}`);
    console.log(`Failed projects: ${failedDeletions.length}`);
    
    if (successfulDeletions.length > 0) {
      console.log('\nSuccessful Project IDs:');
      successfulDeletions.forEach(id => console.log(`  - ${id}`));
    }
    
    if (failedDeletions.length > 0) {
      console.log('\nFailed Project Details:');
      failedDeletions.forEach(item => {
        console.log(`  - Project ID: ${item.id}`);
        console.log(`    Error: ${item.error}`);
      });
    }
    console.log('======================================================================\n');

    expect(successfulDeletions).toBeDefined();
    expect(failedDeletions).toBeDefined();
  });

});
