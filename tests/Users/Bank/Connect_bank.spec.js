// @ts-check
const { test, expect } = require('@playwright/test');
const apiClient = require('../../../utils/apiClient');

/**
 * Reusable function to connect a bank account if it does not already exist.
 * 
 * @param {object} [payloadOverrides] - Additional overrides for the POST payload
 * @returns {Promise<object>} The bank account information (either existing or newly created)
 */
async function connectBankAccountIfNotExists(payloadOverrides = {}) {
  const targetAccountNumber = "SA0380000000608010167519";
  const helperName = "connectBankAccountIfNotExists";

  console.log(`[${helperName}] Step 1: Querying existing bank accounts via GET /api/bank-accounts...`);
  const getResponse = await apiClient.get('/api/bank-accounts');

  // Validate GET API status and structure
  expect(getResponse.status).toBe(200);
  expect(getResponse.body).toBeDefined();
  expect(getResponse.body.success).toBe(true);
  expect(getResponse.body.data).toBeInstanceOf(Array);

  const accounts = getResponse.body.data || [];
  const existingAccount = accounts.find(
    acc => acc && acc.account_number && acc.account_number.trim() === targetAccountNumber
  );

  if (existingAccount) {
    console.log(`[${helperName}] Match found! Bank account ${targetAccountNumber} is already connected. Skipping POST.`);
    return existingAccount;
  }

  console.log(`[${helperName}] No matching account found. Step 2: Connecting bank account via POST /api/bank-accounts...`);

  const defaultPayload = {
    bank_name: "Test Bank Account for testing purpose",
    account_number: targetAccountNumber,
    account_holder_name: "QA Tester",
    proof_of_account: "",
    is_default: true
  };
  const payload = { ...defaultPayload, ...payloadOverrides };

  const postResponse = await apiClient.post('/api/bank-accounts', payload);

  // Validate POST response according to existing assertion conventions
  expect([200, 201]).toContain(postResponse.status);
  expect(postResponse.body).toBeDefined();
  expect(postResponse.body.success).toBe(true);

  const createdAccount = postResponse.body.data || postResponse.body;
  expect(createdAccount).toBeDefined();

  console.log(`[${helperName}] Bank account successfully created/connected.`);
  return createdAccount;
}

test.describe('Bank Account Connection Flow', () => {

  test('should verify connection flow and prevent duplicate creation', async () => {
    console.log('\n============================================================');
    console.log('       STARTING BANK ACCOUNT CONNECTION AUTOMATION FLOW     ');
    console.log('============================================================\n');

    // Step 1: Execute the reusable function
    const accountInfo = await connectBankAccountIfNotExists();
    expect(accountInfo).toBeDefined();
    expect(accountInfo.account_number).toBe("SA0380000000608010167519");

    console.log('\n[Test] Executed connectBankAccountIfNotExists:');
    console.log(JSON.stringify(accountInfo, null, 2));

    // Step 2: Perform final GET verification
    console.log('\n[Test] Running final GET verification to confirm connection state...');
    const verifyResponse = await apiClient.get('/api/bank-accounts');
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.success).toBe(true);

    const accounts = verifyResponse.body.data || [];
    const found = accounts.some(
      acc => acc && acc.account_number && acc.account_number.trim() === "SA0380000000608010167519"
    );
    expect(found).toBe(true);
    console.log(`[Test] Verification successful: Account SA0380000000608010167519 exists in bank accounts.`);

    console.log('\n============================================================');
    console.log('       BANK ACCOUNT CONNECTION COMPLETED SUCCESSFULLY       ');
    console.log('============================================================\n');
  });

});

module.exports = {
  connectBankAccountIfNotExists
};
