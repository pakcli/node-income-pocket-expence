// Test Inspector Features: Direct Transaction Add, Admin/Shipping Fees, Attachments

// Mock browser globals for Node test environment
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); },
  removeItem(k) { delete this.data[k]; },
  clear() { this.data = {}; }
};
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};
global.CustomEvent = class CustomEvent {
  constructor(type, detail) {
    this.type = type;
    this.detail = detail;
  }
};

async function run() {
  console.log('🧪 Testing Inspector Add Transaction, Fee Breakdown & Attachments...');

  const { store } = await import('./frontend/js/store.js');

  // 1. Initial State Check
  console.log('1. Verifying initial store state:');
  console.log(`   - Pockets: ${store.state.pockets.length}`);
  console.log(`   - Incomes: ${store.state.incomeSources.length}`);
  console.log(`   - Expenses: ${store.state.expenseCategories.length}`);
  console.log(`   - Transactions: ${store.state.transactions.length}`);

  // 2. Add Expense with Admin Fee and Shipping Fee from Inspector
  const initialBcaBalance = store.state.pockets.find(p => p.id === 'pkt_bca').balance;
  console.log(`2. Initial Bank BCA balance: Rp ${initialBcaBalance.toLocaleString('id-ID')}`);

  await store.addTransaction({
    type: 'expense',
    fromId: 'pkt_bca',
    fromLabel: 'Bank BCA',
    toId: 'exp_campus',
    toLabel: 'Fotokopi & Buku Kuliah',
    amount: 50000,
    adminFee: 2500,
    shippingFee: 10000,
    date: '2026-09-06',
    note: 'Beli buku referensi + ongkir + admin transfer',
    attachments: [
      {
        id: 'att_test_1',
        name: 'Invoice_Toko_Buku.pdf',
        type: 'application/pdf',
        size: '215 KB',
        date: '2026-09-06'
      }
    ]
  });

  const updatedBcaBalance = store.state.pockets.find(p => p.id === 'pkt_bca').balance;
  const totalDeducted = initialBcaBalance - updatedBcaBalance;
  console.log(`   - Updated Bank BCA balance: Rp ${updatedBcaBalance.toLocaleString('id-ID')}`);
  console.log(`   - Total deducted: Rp ${totalDeducted.toLocaleString('id-ID')} (expected 50000 + 2500 + 10000 = 62500)`);

  if (totalDeducted !== 62500) {
    throw new Error(`Expected deduction 62500, got ${totalDeducted}`);
  }
  console.log('   [PASS] Expense balance deduction with admin fee & shipping fee accurate!');

  // 3. Test Transfer with Admin Fee
  const bcaBeforeTransfer = store.state.pockets.find(p => p.id === 'pkt_bca').balance;
  const gopayBeforeTransfer = store.state.pockets.find(p => p.id === 'pkt_gopay').balance;

  await store.addTransaction({
    type: 'transfer',
    fromId: 'pkt_bca',
    fromLabel: 'Bank BCA',
    toId: 'pkt_gopay',
    toLabel: 'GoPay / E-Wallet',
    amount: 100000,
    adminFee: 1500,
    date: '2026-09-07',
    note: 'Top up GoPay via BCA Mobile'
  });

  const bcaAfterTransfer = store.state.pockets.find(p => p.id === 'pkt_bca').balance;
  const gopayAfterTransfer = store.state.pockets.find(p => p.id === 'pkt_gopay').balance;

  const bcaDeduction = bcaBeforeTransfer - bcaAfterTransfer;
  const gopayInflow = gopayAfterTransfer - gopayBeforeTransfer;

  console.log(`3. Transfer Test:`);
  console.log(`   - BCA deducted: Rp ${bcaDeduction.toLocaleString('id-ID')} (expected 100000 + 1500 = 101500)`);
  console.log(`   - GoPay received: Rp ${gopayInflow.toLocaleString('id-ID')} (expected 100000)`);

  if (bcaDeduction !== 101500 || gopayInflow !== 100000) {
    throw new Error(`Transfer calculation mismatch: BCA -${bcaDeduction}, GoPay +${gopayInflow}`);
  }
  console.log('   [PASS] Transfer with admin fee calculation verified!');

  // 4. Test Attachment Retrieval
  const bcaAttachments = store.getNodeAttachments('pkt_bca');
  console.log(`4. Attachment Retrieval for pkt_bca: Found ${bcaAttachments.length} attachments`);
  const hasInvoice = bcaAttachments.some(a => a.name === 'Invoice_Toko_Buku.pdf');
  if (!hasInvoice) {
    throw new Error('Expected Invoice_Toko_Buku.pdf in pkt_bca attachments!');
  }
  console.log('   [PASS] Node attachment retrieval verified!');

  // 5. Test Direct Node Attachment Addition
  await store.addAttachmentToNode('pkt_cash', {
    id: 'att_manual_cash',
    name: 'Kwitansi_Manual.jpg',
    type: 'image/jpeg',
    size: '120 KB',
    date: '2026-09-07'
  });
  const cashAttachments = store.getNodeAttachments('pkt_cash');
  const hasCashAtt = cashAttachments.some(a => a.name === 'Kwitansi_Manual.jpg');
  if (!hasCashAtt) {
    throw new Error('Expected Kwitansi_Manual.jpg in pkt_cash attachments!');
  }
  console.log('   [PASS] Direct node attachment addition verified!');

  console.log('\n🎉 ALL INSPECTOR FEATURE TESTS PASSED 100%!\n');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
