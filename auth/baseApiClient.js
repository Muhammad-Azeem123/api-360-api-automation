const { request } = require('@playwright/test');
const config = require('../config/env');

/**
 * Reusable Base API Client.
 * Encapsulates common HTTP requests using Playwright's `request` utility.
 * Resolves standard responses and disposes context cleanly.
 */
class BaseApiClient {
  /**
   * @param {object} tokenManager - Specific TokenManager instance to load tokens from
   */
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
    this.baseUrl = config.baseUrl;
  }

  /**
   * Helper to create a new APIRequestContext.
   * Custom headers can be passed to extend or override default headers.
   * 
   * @param {object} customHeaders - Additional HTTP headers
   * @returns {Promise<import('@playwright/test').APIRequestContext>}
   */
  async getRequestContext(customHeaders = {}) {
    const token = this.tokenManager.getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    // Automatically inject Bearer Token from TokenManager if not explicitly overridden
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return await request.newContext({
      baseURL: this.baseUrl,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: headers,
    });
  }

  /**
   * Core request executor. Sends the request, processes the response to extract
   * standard fields, and guarantees proper disposal of the request context.
   * 
   * @private
   * @param {import('@playwright/test').APIRequestContext} context - The Playwright request context
   * @param {'get' | 'post' | 'put' | 'delete' | 'patch'} method - HTTP verb
   * @param {string} endpoint - Relative path URL
   * @param {object} [options] - Options like data payload
   */
  async _execute(context, method, endpoint, options = {}) {
    try {
      const response = await context[method](endpoint, options);
      
      const status = response.status();
      const headers = response.headers();
      const text = await response.text();
      
      let body;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      return { status, body, headers };
    } finally {
      await context.dispose();
    }
  }

  /**
   * Perform an HTTP GET request.
   */
  async get(endpoint, headers = {}) {
    const context = await this.getRequestContext(headers);
    return await this._execute(context, 'get', endpoint);
  }

  /**
   * Perform an HTTP POST request.
   */
  async post(endpoint, data = {}, headers = {}) {
    const context = await this.getRequestContext(headers);
    return await this._execute(context, 'post', endpoint, { data });
  }

  /**
   * Perform an HTTP PUT request.
   */
  async put(endpoint, data = {}, headers = {}) {
    const context = await this.getRequestContext(headers);
    return await this._execute(context, 'put', endpoint, { data });
  }

  /**
   * Perform an HTTP DELETE request.
   */
  async delete(endpoint, headers = {}) {
    const context = await this.getRequestContext(headers);
    return await this._execute(context, 'delete', endpoint);
  }

  /**
   * Perform an HTTP PATCH request.
   */
  async patch(endpoint, data = {}, headers = {}) {
    const context = await this.getRequestContext(headers);
    return await this._execute(context, 'patch', endpoint, { data });
  }
}

module.exports = BaseApiClient;
