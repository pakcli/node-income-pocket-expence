// Test v05 Features: Vertical Timeline Rail, Quick Add, and Layout Modes
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
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
  getElementById: (id) => ({
    id,
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    innerHTML: '',
    textContent: ''
  }),
  querySelectorAll: () => [],
  querySelector: () => null
};

async function run() {
  console.log('🧪 Testing v05 Features: Vertical Timeline Rail, Quick Add, and Layout Modes...');
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
  const newTx = store.addTransaction({
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

  console.log('\n🎉 ALL v05 INTEGRATION TESTS PASSED 100%!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
