/**
 * Utility validation functions for API Products and prefixes.
 */

/**
 * Validates a project name string against the API Product Name rules.
 * 
 * Rules:
 * 1. Only letters (a-z, A-Z), numbers (0-9), and the characters . - _ ~ are allowed.
 * 2. Cannot start with ., -, _, or ~.
 * 3. Cannot end with ., -, _, or ~.
 * 4. No spaces or other special characters allowed.
 * 5. The field is required (mandatory).
 * 
 * @param {string} name
 * @returns {{ valid: boolean, message?: string }}
 */
function validateProjectName(name) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { valid: false, message: 'The project name field is required.' };
  }
  const specialChars = ['.', '-', '_', '~'];
  if (specialChars.includes(name[0])) {
    return { valid: false, message: 'The project name cannot start with one of . - _ ~' };
  }
  if (specialChars.includes(name[name.length - 1])) {
    return { valid: false, message: 'The project name cannot end with one of . - _ ~' };
  }
  if (!/^[a-zA-Z0-9._~-]+$/.test(name)) {
    return { valid: false, message: 'Only letters, numbers, and the characters . - _ ~ are allowed.' };
  }
  return { valid: true };
}

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

module.exports = {
  validateProjectName,
  validatePrefix
};
