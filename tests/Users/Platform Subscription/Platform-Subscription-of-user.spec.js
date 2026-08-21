const { test, expect, request: playwrightRequest } = require('@playwright/test');
const apiClient = require('../../../utils/apiClient');
const readline = require('readline');
const fs = require('fs');

test('Subscribe user to a Platform Subscription plan', async () => {
  // Allow up to 2 minutes for interactive terminal input
  test.setTimeout(120000);

  console.log('\n============================================================');
  console.log('       STARTING PLATFORM SUBSCRIPTION AUTOMATION FLOW       ');
  console.log('============================================================\n');

  // Step 1: Check current Platform Subscription
  console.log('Checking current Platform Subscription...');
  const meResponse = await apiClient.get('/api/consumer/platform-subscriptions/me');

  if (meResponse.status === 200 && meResponse.body && meResponse.body.success) {
    const subData = meResponse.body.data;
    if (subData && subData.status === 'active') {
      console.log('\n============================================================');
      console.log(`Platform Subscription Status: Already Active`);
      console.log(`Plan: ${subData.plan_name || 'N/A'}`);
      console.log(`Tier: ${subData.tier_name || 'N/A'}`);
      console.log(`Billing Cycle: ${subData.billing_cycle || 'N/A'}`);
      console.log('============================================================\n');
      console.log('Exiting subscription flow gracefully.');
      return;
    } else {
      console.log(`Found existing subscription but status is: ${subData ? subData.status : 'N/A'}. Proceeding with subscription flow.`);
    }
  } else if (meResponse.status === 404) {
    console.log('Platform Subscription: Not Active (No active subscription found)');
  } else {
    console.log(`Unexpected response status from /me: ${meResponse.status}. Proceeding...`);
  }

  // Step 2: Get all available Platform Subscription plans
  console.log('\nFetching available Platform Subscription plans...');
  const plansResponse = await apiClient.get('/api/consumer/platform-subscriptions');
  expect(plansResponse.status).toBe(200);
  expect(plansResponse.body).toBeDefined();
  expect(plansResponse.body.success).toBe(true);
  expect(plansResponse.body.data).toBeInstanceOf(Array);

  const plans = plansResponse.body.data;
  if (!plans || plans.length === 0) {
    throw new Error('ERROR: Unable to retrieve Platform Subscription plans. Plans list is empty.');
  }

  // Step 3: Print all available plans
  console.log('\n============================================================');
  console.log('        AVAILABLE PLATFORM SUBSCRIPTION PLANS');
  console.log('============================================================');
  plans.forEach((plan, idx) => {
    console.log(`\n${idx + 1}. Plan Name: ${plan.name}`);
    console.log(`   Description: ${plan.description || 'No description'}`);
    console.log(`   Monthly Price: ${plan.monthly_price !== undefined ? plan.monthly_price : 'N/A'}`);
    console.log(`   Annual Price: ${plan.annual_price !== undefined ? plan.annual_price : 'N/A'}`);
    console.log(`   Monthly Request Limit: ${plan.monthly_request_limit !== undefined ? plan.monthly_request_limit : 'N/A'}`);

    if (plan.included_features && plan.included_features.length > 0) {
      console.log('   Default Features:');
      plan.included_features.forEach(feature => {
        console.log(`     - ${feature.name}: ${feature.description || 'No description'}`);
      });
    }

    if (plan.tiers && plan.tiers.length > 0) {
      console.log('   Tiers:');
      plan.tiers.forEach(tier => {
        console.log(`     * Tier Name: ${tier.name}`);
        console.log(`       Tier ID: ${tier.id}`);
        console.log(`       Monthly Price: ${tier.monthly_price}`);
        console.log(`       Annual Price: ${tier.annual_price}`);
        console.log(`       Monthly Request Limit: ${tier.monthly_request_limit}`);
        if (tier.included_features && tier.included_features.length > 0) {
          console.log('       Included Features:');
          tier.included_features.forEach(feat => {
            console.log(`         - ${feat.name}`);
          });
        }
      });
    }
    console.log('\n------------------------------------------------------------');
  });
  console.log('============================================================\n');

  // Step 4: Terminal User Input - Plan Name
  let rl = null;
  function askQuestion(query) {
    if (!rl) {
      const consoleStream = process.platform === 'win32'
        ? fs.createReadStream('\\\\.\\CON')
        : fs.createReadStream('/dev/tty');
      rl = readline.createInterface({
        input: consoleStream,
        output: process.stdout
      });
    }
    return new Promise((resolve) => {
      rl.question(query, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  function closeReadline() {
    if (rl) {
      rl.close();
      rl = null;
    }
  }

  let selectedPlanName = '';
  if (process.env.SELECTED_PLAN_NAME) {
    selectedPlanName = process.env.SELECTED_PLAN_NAME.trim();
    console.log(`[Automation] Selected Plan Name (from env): ${selectedPlanName}`);
  } else {
    selectedPlanName = await askQuestion('Enter plan name to subscribe: ');
  }

  // Step 5: Find the selected plan dynamically
  const matchedPlan = plans.find(
    p => p.name.trim().toLowerCase() === selectedPlanName.trim().toLowerCase()
  );

  if (!matchedPlan) {
    closeReadline();
    console.error(`\nERROR: Plan "${selectedPlanName}" was not found.`);
    console.error('Available plans:');
    plans.forEach(p => console.error(`- ${p.name}`));
    throw new Error(`Plan "${selectedPlanName}" not found.`);
  }

  console.log(`\nSelected Plan: ${matchedPlan.name}`);

  // Step 6: Dynamically resolve tier ID
  let tierId = '';
  let selectedTier = null;

  if (!matchedPlan.tiers || matchedPlan.tiers.length === 0) {
    closeReadline();
    throw new Error(`ERROR: Selected plan "${matchedPlan.name}" does not contain any tiers.`);
  }

  if (matchedPlan.tiers.length === 1) {
    selectedTier = matchedPlan.tiers[0];
    tierId = selectedTier.id;
    console.log(`Selected Tier: ${selectedTier.name}`);
    console.log(`Tier ID: ${tierId}`);
  } else {
    // If multiple tiers, prompt the user for the tier name
    console.log(`The plan "${matchedPlan.name}" has multiple tiers:`);
    matchedPlan.tiers.forEach(t => console.log(`- ${t.name} (Monthly Price: ${t.monthly_price})`));

    let selectedTierName = '';
    if (process.env.SELECTED_TIER_NAME) {
      selectedTierName = process.env.SELECTED_TIER_NAME.trim();
      console.log(`[Automation] Selected Tier Name (from env): ${selectedTierName}`);
    } else {
      selectedTierName = await askQuestion('Enter tier name to subscribe: ');
    }

    selectedTier = matchedPlan.tiers.find(
      t => t.name.trim().toLowerCase() === selectedTierName.trim().toLowerCase()
    );

    if (!selectedTier) {
      closeReadline();
      console.error(`\nERROR: Tier "${selectedTierName}" was not found for plan "${matchedPlan.name}".`);
      throw new Error(`Tier "${selectedTierName}" not found.`);
    }

    tierId = selectedTier.id;
    console.log(`Selected Tier: ${selectedTier.name}`);
    console.log(`Tier ID: ${tierId}`);
  }

  closeReadline();

  if (!tierId) {
    throw new Error('ERROR: Selected plan/tier does not contain a tier_id.');
  }

  // Step 7: Subscribe to selected plan
  console.log(`\nSubscribing to plan "${matchedPlan.name}" / tier "${selectedTier.name}"...`);
  const subscribeResponse = await apiClient.post('/api/consumer/platform-subscriptions/subscribe', {
    tier_id: tierId,
    billing_cycle: 'monthly'
  });

  expect(subscribeResponse.status).toBe(200);
  expect(subscribeResponse.body).toBeDefined();
  expect(subscribeResponse.body.success).toBe(true);

  // Extract order number from response fields
  let orderNumber = null;
  if (subscribeResponse.body.data) {
    if (subscribeResponse.body.data.order_number) {
      orderNumber = subscribeResponse.body.data.order_number;
    } else if (subscribeResponse.body.data.id) {
      orderNumber = subscribeResponse.body.data.id;
    }
  }

  if (!orderNumber) {
    console.error('ERROR: Subscribe API did not return an order number or ID.', JSON.stringify(subscribeResponse.body, null, 2));
    throw new Error('ERROR: Subscribe API did not return an order number.');
  }

  console.log(`Subscription created.`);
  console.log(`Order Number: ${orderNumber}`);

  // Step 8: Moyasar Token
  console.log('\nGenerating Moyasar payment token...');
  const moyasarContext = await playwrightRequest.newContext();
  const moyasarResponse = await moyasarContext.post('https://api.moyasar.com/v1/tokens', {
    data: {
      name: "Test User",
      number: "4111111111111111",
      month: "12",
      year: "2030",
      cvc: "321",
      publishable_api_key: "pk_test_oLZkTjzHETgu5ibZ652NnaN7tvj63vTNqWxSsF67",
      save_only: true
    }
  });

  const moyasarBody = await moyasarResponse.json();
  await moyasarContext.dispose();

  expect(moyasarResponse.status()).toBe(201);
  expect(moyasarBody.id).toBeTruthy();
  const moyasarToken = moyasarBody.id;
  console.log(`Moyasar token generated successfully: ${moyasarToken.replace(/(?<=.{4}).(?=.{4})/g, '*')}`);

  // Step 9: Initiate Platform Subscription payment
  console.log('\nInitiating payment...');
  const paymentResponse = await apiClient.post('/api/consumer/platform-subscriptions/payment/initiate', {
    token: moyasarToken,
    card_id: null,
    save_card: false,
    order_number: orderNumber
  });

  expect(paymentResponse.status).toBe(200);
  expect(paymentResponse.body).toBeDefined();

  // Step 10: Handle Payment Authentication / 3DS Redirect if required
  let redirectUrl = null;
  if (paymentResponse.body) {
    const data = paymentResponse.body.data || paymentResponse.body;
    redirectUrl = data.redirect_url || data.transaction_url || (data.source && data.source.transaction_url);
  }

  if (redirectUrl) {
    console.log(`[Payment] Redirect/3DS authentication required. Redirection URL: ${redirectUrl}`);

    // Extract auth ID from the URL (format: https://api.moyasar.com/v1/card_auth/<AUTH_ID>/prepare)
    const authIdMatch = redirectUrl.match(/\/card_auth\/([^\/]+)/);
    if (!authIdMatch) {
      throw new Error(`ERROR: Could not parse 3DS authentication ID from URL: ${redirectUrl}`);
    }
    const authId = authIdMatch[1];
    console.log(`Extracted 3DS Authentication ID: ${authId}`);

    console.log('Simulating 3DS authentication steps programmatically over HTTP...');
    const authContext = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

    // Step 10.1: Submit simulated device information
    const authUrl = `https://api.moyasar.com/v1/card_auth/${authId}/authenticate`;
    console.log(`Submitting simulated device info to: ${authUrl}`);
    const authResponse = await authContext.post(authUrl, {
      data: {
        color_depth: 24,
        js_enabled: true,
        language: 'en-US',
        screen_height: 1080,
        screen_width: 1920,
        time_zone: -300
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    expect(authResponse.status()).toBe(200);

    // Step 10.2: Submit transaction authentication approval (Sandbox Success)
    const setResultUrl = `https://api.moyasar.com/v1/card_auth/${authId}/set_auth_result`;
    console.log(`Approving sandbox transaction at: ${setResultUrl}`);
    const setResultResponse = await authContext.post(setResultUrl, {
      data: {
        auth_result: 'AUTHENTICATED'
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    expect(setResultResponse.status()).toBe(200);

    // Step 10.3: Call acs_return to complete the session and capture the return URL
    const returnUrl = `https://api.moyasar.com/v1/card_auth/${authId}/acs_return`;
    console.log(`Completing session at: ${returnUrl}`);
    const returnResponse = await authContext.post(returnUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    expect(returnResponse.status()).toBe(200);

    const returnBody = await returnResponse.text();
    const callbackMatch = returnBody.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
    const callbackUrl = callbackMatch ? callbackMatch[1] : null;

    if (callbackUrl) {
      console.log(`Callback URL found: ${callbackUrl}`);

      // Extract the payment ID from the callback URL
      const paymentIdMatch = callbackUrl.match(/[?&]id=([^&]+)/);
      const paymentId = paymentIdMatch ? paymentIdMatch[1] : null;
      console.log(`Extracted Payment ID: ${paymentId}`);

      if (paymentId) {
        // Send confirmation request to backend confirm endpoint using authorized client
        console.log('Sending confirmation request to backend confirm endpoint...');
        const confirmRes = await apiClient.post('/api/consumer/platform-subscriptions/payment/confirm', {
          payment_id: paymentId
        });
        console.log(`Backend confirm status: ${confirmRes.status}`, JSON.stringify(confirmRes.body));
        expect(confirmRes.status).toBe(200);
        expect(confirmRes.body).toBeDefined();
        expect(confirmRes.body.success).toBe(true);
        expect(confirmRes.body.data ? confirmRes.body.data.status : null).toBe('active');
      }
    } else {
      console.log('Warning: No callback URL parsed from acs_return response.');
    }

    await authContext.dispose();
    console.log('Payment authentication flow completed successfully.');
  } else {
    console.log('Payment initiated successfully (no 3DS redirection required).');
  }

  // Step 11: Verify Subscription Activation
  console.log('\nVerifying Platform Subscription...');
  const verifyResponse = await apiClient.get('/api/consumer/platform-subscriptions/me');
  expect(verifyResponse.status).toBe(200);
  expect(verifyResponse.body).toBeDefined();
  expect(verifyResponse.body.success).toBe(true);

  const finalSub = verifyResponse.body.data;
  expect(finalSub).toBeDefined();
  expect(finalSub.status).toBe('active');

  console.log('\n============================================================');
  console.log('       PLATFORM SUBSCRIPTION ACTIVATED SUCCESSFULLY');
  console.log('============================================================');
  console.log(`Plan: ${finalSub.plan_name}`);
  console.log(`Tier: ${finalSub.tier_name}`);
  console.log(`Billing Cycle: ${finalSub.billing_cycle}`);
  console.log(`Order Number: ${orderNumber}`);
  console.log(`Status: ${finalSub.status}`);
  console.log('============================================================\n');
});
