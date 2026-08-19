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
    this.apiPrefix = config.apiPrefix;
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

    const context = await request.newContext({
      baseURL: this.baseUrl,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: headers,
    });

    // Proxy wrapper to rewrite paths starting with /portaldev/api to /portalstg/api in staging
    const handler = {
      get(target, propKey, receiver) {
        const origMethod = target[propKey];
        if (typeof origMethod === 'function') {
          if (['get', 'post', 'put', 'delete', 'patch', 'fetch', 'head'].includes(propKey)) {
            return function (...args) {
              if (args.length > 0 && typeof args[0] === 'string') {
                const oldUrl = args[0];
                let rewritten = false;
                if (args[0].startsWith('/portaldev/api')) {
                  args[0] = args[0].replace('/portaldev/api', config.apiPrefix);
                  rewritten = true;
                } else if (args[0].startsWith('/api')) {
                  args[0] = args[0].replace('/api', config.apiPrefix);
                  rewritten = true;
                }
                if (rewritten && oldUrl !== args[0]) {
                  console.log(`[BaseApiClient Proxy] Rewrote URL: ${oldUrl} -> ${args[0]}`);
                }
              }
              return origMethod.apply(target, args);
            };
          }
          return origMethod.bind(target);
        }
        return Reflect.get(target, propKey, receiver);
      }
    };

    return new Proxy(context, handler);
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
