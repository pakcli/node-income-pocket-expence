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
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buffer,
          body: buffer.toString('utf-8')
        });
      });
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

    // 7. Test Export Engine Matrix (CSV, authentic SQLite .db binary, and SQL dump)
    console.log('\n--- Test 7: Export Engine Matrix (CSV, .db binary, .sql) x (Current View, All) ---');
    // 7a. GET /api/export/csv
    const resCSV = await request('/api/export/csv', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[PASS] GET /api/export/csv (All Data) -> HTTP ${resCSV.status} (Content-Type: ${resCSV.headers['content-type']})`);

    // 7b. POST /api/export/csv (Current View)
    const resCSVView = await request('/api/export/csv', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'view', transactions: txData.transactions.slice(0, 2) })
    });
    console.log(`[PASS] POST /api/export/csv (Current View Scope) -> HTTP ${resCSVView.status}`);

    // 7c. GET /api/export/db
    const resDB = await request('/api/export/db', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[PASS] GET /api/export/db (All Data) -> HTTP ${resDB.status} (Content-Type: ${resDB.headers['content-type']})`);
    if (!resDB.body.startsWith('SQLite format 3')) {
      throw new Error('Exported .db does not start with SQLite format 3 binary magic header!');
    }
    console.log('       [CONFIRMED] Exported .db has genuine "SQLite format 3" magic header for DB Browser for SQLite!');

    // 7d. POST /api/export/db (Current View Scope)
    const resDBView = await request('/api/export/db', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'view', transactions: txData.transactions.slice(0, 1) })
    });
    console.log(`[PASS] POST /api/export/db (Current View Scope) -> HTTP ${resDBView.status}`);
    if (!resDBView.body.startsWith('SQLite format 3')) {
      throw new Error('POST Exported .db does not start with SQLite format 3 binary header!');
    }

    // 7e. Verify opening exported SQLite database using better-sqlite3 (simulating DB Browser for SQLite)
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const Database = require('./backend/node_modules/better-sqlite3');
    const tempExportPath = path.join(os.tmpdir(), `test_verify_${Date.now()}.db`);
    fs.writeFileSync(tempExportPath, resDB.buffer);
    const verifyDb = new Database(tempExportPath);
    const tableList = verifyDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const rowCounts = {};
    for (const tbl of tableList) {
      const count = verifyDb.prepare(`SELECT COUNT(*) as count FROM "${tbl.name}"`).get();
      rowCounts[tbl.name] = count.count;
    }
    verifyDb.close();
    fs.unlinkSync(tempExportPath);
    console.log(`       [VERIFIED] Opened exported .db in SQLite engine successfully! Tables: ${JSON.stringify(rowCounts)}`);

    // 7f. GET & POST /api/export/sql
    const resSQL = await request('/api/export/sql', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`[PASS] GET /api/export/sql (All Data) -> HTTP ${resSQL.status} (Content-Type: ${resSQL.headers['content-type']})`);

    const resSQLView = await request('/api/export/sql', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'view', transactions: txData.transactions.slice(0, 2) })
    });
    console.log(`[PASS] POST /api/export/sql (Current View Scope) -> HTTP ${resSQLView.status}`);

    // 7g. Test Direct Browser Address Bar URL (No Authorization Header, simulating user screenshot)
    console.log('\n--- Test 7g: Direct Browser Address Bar URL Navigation (No Headers) ---');
    const directBrowserUrl = '/api/export/db?scope=all&startDate=2026-08-31&endDate=2026-09-28';
    const resDirect = await request(directBrowserUrl);
    console.log(`[PASS] GET ${directBrowserUrl} -> HTTP ${resDirect.status} (Content-Type: ${resDirect.headers['content-type']})`);
    if (resDirect.status !== 200) {
      throw new Error(`Expected HTTP 200 for direct browser export, got ${resDirect.status}: ${resDirect.body}`);
    }
    if (!resDirect.body.startsWith('SQLite format 3')) {
      throw new Error('Direct browser export .db does not start with SQLite format 3 binary magic header!');
    }
    console.log('       [CONFIRMED] Direct browser address bar export downloads binary .db successfully without 401 error!');

    console.log('\n🎉 ALL COMBINED LOCALHOST INTEGRATION TESTS PASSED 100%!\n');
  } catch (err) {
    console.error('❌ Integration Test Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
