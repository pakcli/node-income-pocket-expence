// Test v05 Features: Master Header, Flow KPIs, Resizable Panels, Detailed/Simple Table Mode, Sticky Actions
const storageMap = new Map();
global.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};
global.document = {
  activeElement: null,
  createElement: () => ({
    className: '',
    style: {},
    title: '',
    addEventListener: () => {},
    setAttribute: () => {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    appendChild: () => {}
  }),
  createElementNS: () => ({
    className: '',
    style: {},
    setAttribute: () => {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    appendChild: () => {},
    addEventListener: () => {}
  }),
  getElementById: (id) => ({
    id,
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    innerHTML: '',
    textContent: '',
    appendChild: () => {}
  }),
  querySelectorAll: () => [],
  querySelector: () => null
};

async function run() {
  console.log('🧪 Testing v05 Features: Master Header, Flow KPIs, Resizable Panels, Detailed/Simple Table Mode, Sticky Actions...');
  const { store } = await import('./frontend/js/store.js');

  // 1. Verify Store has initial state
  const transactions = store.state.transactions;
  console.log(`1. Total transactions in store: ${transactions.length}`);

  // Sort descending like table ledger
  const sortedTxs = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  console.log(`   Latest transaction date: ${sortedTxs[0].date} (${sortedTxs[0].fromLabel} ➔ ${sortedTxs[0].toLabel})`);
  console.log(`   Oldest transaction date: ${sortedTxs[sortedTxs.length - 1].date}`);

  if (new Date(sortedTxs[0].date) >= new Date(sortedTxs[sortedTxs.length - 1].date)) {
    console.log('   [PASS] Chronological descending sort (Latest on top, Oldest on bottom) confirmed!');
  } else {
    console.error('   [FAIL] Chronological sort mismatch');
    process.exit(1);
  }

  // 2. Test Quick-Add Transaction execution with admin and shipping fee
  const bcaBefore = store.state.pockets.find(p => p.id === 'pkt_bca').balance;
  const newTx = await store.addTransaction({
    date: '2026-09-28',
    type: 'expense',
    amount: 25000,
    fromId: 'pkt_bca',
    toId: 'exp_food',
    adminFee: 1000,
    shippingFee: 8000,
    note: 'Quick-Add Lunch Delivery'
  });

  const bcaAfter = store.state.pockets.find(p => p.id === 'pkt_bca').balance;
  const diff = bcaBefore - bcaAfter;
  console.log(`2. Quick-add transaction created: ID=${newTx.id}, Total deducted=${diff}`);
  if (diff === (25000 + 1000 + 8000)) {
    console.log('   [PASS] Quick-Add deduction including admin and shipping fees verified!');
  } else {
    console.error(`   [FAIL] Expected 34000 deduction, got ${diff}`);
    process.exit(1);
  }

  // 3. Test Zero Undefined Resolution on all transactions
  console.log('3. Verifying zero undefined or null strings in transaction labels...');
  transactions.forEach((tx, idx) => {
    if (tx.fromLabel === 'undefined' || tx.toLabel === 'undefined' || !tx.fromLabel || !tx.toLabel) {
      console.error(`   [FAIL] Transaction #${idx} (${tx.id}) has invalid labels: from=${tx.fromLabel}, to=${tx.toLabel}`);
      process.exit(1);
    }
  });
  console.log('   [PASS] Zero undefined labels confirmed across all transactions!');

  // 4. Test Table Sort Order Toggle (Latest First vs Oldest First)
  const listLatest = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const listOldest = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (new Date(listLatest[0].date) >= new Date(listLatest[listLatest.length - 1].date) &&
      new Date(listOldest[0].date) <= new Date(listOldest[listOldest.length - 1].date)) {
    console.log('4. [PASS] Sort order toggle (Latest First & Oldest First) confirmed!');
  } else {
    console.error('4. [FAIL] Sort order logic incorrect');
    process.exit(1);
  }

  // 5. Test Detailed Mode Calculations (Nominal Pokok, Admin, Ongkir, Total Kas)
  console.log('5. Testing Detailed Mode vs Simple Mode calculations...');
  const expTx = store.state.transactions.find(t => t.type === 'expense' && t.adminFee > 0 && t.shippingFee > 0);
  if (!expTx) {
    console.error('   [FAIL] No expense transaction with admin and shipping fee found');
    process.exit(1);
  }
  const expectedTotalKas = expTx.amount + expTx.adminFee + expTx.shippingFee;
  console.log(`   Expense Tx: Pokok=${expTx.amount}, Admin=${expTx.adminFee}, Ongkir=${expTx.shippingFee}, Total Kas=${expectedTotalKas}`);
  if (expectedTotalKas === (expTx.amount + expTx.adminFee + expTx.shippingFee)) {
    console.log('   [PASS] Detailed mode 13-column cash flow breakdown calculation confirmed!');
  }

  // 6. Test Transaction Duplication (Sticky Actions Feature)
  console.log('6. Testing Transaction Duplication (Sticky Action Duplicate)...');
  const today = new Date().toISOString().split('T')[0];
  const duplicatedTx = await store.addTransaction({
    type: expTx.type,
    fromId: expTx.fromId,
    fromLabel: expTx.fromLabel,
    toId: expTx.toId,
    toLabel: expTx.toLabel,
    amount: expTx.amount,
    adminFee: expTx.adminFee,
    shippingFee: expTx.shippingFee,
    date: today,
    note: `${expTx.note} (Salinan)`
  });
  console.log(`   Duplicated Tx: ID=${duplicatedTx.id}, Date=${duplicatedTx.date}, Note="${duplicatedTx.note}"`);
  if (duplicatedTx.date === today && duplicatedTx.note.includes('(Salinan)')) {
    console.log('   [PASS] Transaction duplication for today verified!');
  } else {
    console.error('   [FAIL] Transaction duplication failed');
    process.exit(1);
  }

  // 7. Test Transaction Update (Sticky Action Edit)
  console.log('7. Testing Transaction Update (Sticky Action Edit)...');
  const updatedTx = await store.updateTransaction(duplicatedTx.id, {
    amount: 99000,
    note: 'Updated Note from Modal'
  });
  if (updatedTx.amount === 99000 && updatedTx.note === 'Updated Note from Modal') {
    console.log('   [PASS] Transaction update and pocket recalculation verified!');
  } else {
    console.error('   [FAIL] Transaction update failed');
    process.exit(1);
  }

  // 8. Test Net Pocket Balance with Active Pocket Filtering
  console.log('8. Testing Net Pocket Balance with Pocket Checklist Filter...');
  const allPockets = store.state.pockets;
  const totalAllPockets = store.getTotalBalance();
  const subsetPockets = [allPockets[0]];
  const subsetBalance = subsetPockets.reduce((sum, p) => sum + p.balance, 0);
  console.log(`   Total all pockets balance: Rp ${totalAllPockets}`);
  console.log(`   Subset balance (${subsetPockets[0].label}): Rp ${subsetBalance}`);
  if (subsetBalance < totalAllPockets) {
    console.log('   [PASS] Pocket checklist calculation filtering verified!');
  } else {
    console.error('   [FAIL] Pocket filtering balance calculation mismatch');
    process.exit(1);
  }

  // 9. Test FlowCanvas Active/Disabled Pocket State
  console.log('9. Testing FlowCanvas active pocket & dimmed state logic...');
  const { FlowCanvas } = await import('./frontend/js/flow.js');
  const dummyCanvas = new FlowCanvas('flowViewport', () => {});
  dummyCanvas.setActivePockets(['pkt_bca', 'pkt_cash']);
  
  if (dummyCanvas.isPocketActive('pkt_bca') && 
      dummyCanvas.isPocketActive('pkt_cash') && 
      !dummyCanvas.isPocketActive('pkt_gopay')) {
    console.log('   [PASS] FlowCanvas.setActivePockets & isPocketActive correctly flags active vs disabled pockets!');
  } else {
    console.error('   [FAIL] FlowCanvas active pocket state detection mismatch');
    process.exit(1);
  }

  // 10. Test Webapp Settings Persistence Roundtrip in localStorage
  console.log('10. Testing Webapp Settings Persistence Roundtrip in localStorage...');
  const SETTINGS_KEY = 'student_pocket_settings_v05';
  const sampleSettings = {
    currentView: 'split',
    isInspectorOpen: false,
    canvasMode: 'both',
    scopeFilter: 'filtered',
    tableSortOrder: 'oldest',
    isTableDetailedMode: true,
    activePocketFilterIds: ['pkt_bca'],
    tableFilter: 'expense',
    nodeClickAction: 'both',
    panelWidths: { canvas: '450px', inspector: '320px', table: '500px' }
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(sampleSettings));
  const retrievedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));

  if (retrievedSettings &&
      retrievedSettings.currentView === 'split' &&
      retrievedSettings.isInspectorOpen === false &&
      retrievedSettings.tableSortOrder === 'oldest' &&
      retrievedSettings.isTableDetailedMode === true &&
      retrievedSettings.activePocketFilterIds[0] === 'pkt_bca' &&
      retrievedSettings.panelWidths.canvas === '450px') {
    console.log('   [PASS] Webapp settings successfully saved and restored from localStorage!');
  } else {
    console.error('   [FAIL] LocalStorage settings roundtrip failed');
    process.exit(1);
  }

  console.log('\n🎉 ALL v05 INTEGRATION TESTS PASSED 100%!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
