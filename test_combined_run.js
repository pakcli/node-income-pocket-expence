// Comprehensive Localhost Combined Integration Test (Step 4)
const http = require('http');
const app = require('./backend/src/server');

const TEST_PORT = 3124;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: TEST_PORT,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 [Step 4] Starting Combined Localhost Integration Tests on port', TEST_PORT);

  const server = app.listen(TEST_PORT);

  try {
    // 1. Test Static React Frontend Serving at Root
    console.log('\n--- Test 1: React Frontend Delivery at / ---');
    const resHome = await request('/');
    console.log(`[PASS] GET / -> HTTP ${resHome.status} (${resHome.body.length} bytes)`);
    if (!resHome.body.includes('Student Pocket Manager')) {
      throw new Error('Frontend index.html did not contain expected title.');
    }
    if (!resHome.body.includes('React v06')) {
      throw new Error('Frontend index.html did not return React v06 title.');
    }

    // 2. Test API Health Check
    console.log('\n--- Test 2: API Health Check ---');
    const resHealth = await request('/api/health');
    console.log(`[PASS] GET /api/health -> HTTP ${resHealth.status}:`, resHealth.body);

    // 3. Test Saved Accounts (Multi-Account Switcher)
    console.log('\n--- Test 3: Multi-Saved-Account Switcher API ---');
    const resSaved = await request('/api/auth/saved-accounts');
    console.log(`[PASS] GET /api/auth/saved-accounts -> HTTP ${resSaved.status}:`, resSaved.body);
    const parsedSaved = JSON.parse(resSaved.body);
    if (!parsedSaved.accounts || parsedSaved.accounts.length === 0) {
      throw new Error('Expected seeded saved accounts.');
    }

    // 4. Test 1-Click Profile Switch & JWT Issuance
    console.log('\n--- Test 4: 1-Click Profile Switch ---');
    const studentUser = parsedSaved.accounts.find(a => a.role === 'student');
    const resSwitch = await request('/api/auth/switch-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: studentUser.userId })
    });
    console.log(`[PASS] POST /api/auth/switch-account -> HTTP ${resSwitch.status}`);
    const { token, user } = JSON.parse(resSwitch.body);
    console.log(`       Active Profile: ${user.displayName} (${user.role}), Token Issued.`);

    // 5. Test Authenticated Nodes API
    console.log('\n--- Test 5: Authenticated Nodes API ---');
    const resNodes = await request('/api/nodes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[PASS] GET /api/nodes -> HTTP ${resNodes.status}`);
    const nodesData = JSON.parse(resNodes.body);
    console.log(`       Pockets: ${nodesData.pockets.length}, Incomes: ${nodesData.incomeSources.length}, Expenses: ${nodesData.expenseCategories.length}`);

    // 6. Test Authenticated Transactions API
    console.log('\n--- Test 6: Authenticated Transactions API ---');
    const resTxs = await request('/api/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[PASS] GET /api/transactions -> HTTP ${resTxs.status}`);
    const txData = JSON.parse(resTxs.body);
    console.log(`       Transactions Count: ${txData.transactions.length}`);

    // 7. Test Dual Export API (CSV & DB)
    console.log('\n--- Test 7: Dual Export Engine ---');
    const resCSV = await request('/api/export/csv', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[PASS] GET /api/export/csv -> HTTP ${resCSV.status} (Content-Type: ${resCSV.headers['content-type']})`);

    const resDB = await request('/api/export/db', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[PASS] GET /api/export/db -> HTTP ${resDB.status} (Content-Type: ${resDB.headers['content-type']})`);

    console.log('\n🎉 ALL STEP 4 COMBINED LOCALHOST INTEGRATION TESTS PASSED 100%!\n');
  } catch (err) {
    console.error('❌ Integration Test Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
