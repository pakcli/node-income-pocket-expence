// Internationalization (i18n) Module
// Supports English ('en') and Bahasa Indonesia ('id')

const translations = {
  en: {
    app_title: "Student Pocket Manager",
    app_subtitle: "Visual flow-based personal finance tracker",
    mode_simple: "Mode Simple",
    mode_irl: "Mode IRL (Real-life)",
    mode_both: "Mode Both (Total + IRL)",
    view_flow: "Flow Canvas",
    view_ledger: "Ledger",
    view_stats: "Analytics",
    quick_add: "Quick Add",
    btn_income: "+ Income",
    btn_expense: "- Expense",
    btn_transfer: "⇄ Transfer",
    btn_account: "+ Pocket",
    export_menu: "Export",
    export_csv: "Export CSV (Spreadsheet)",
    export_json: "Export JSON / Data Backup",
    export_db: "Export Database (.db)",
    total_balance: "Net Pocket Balance",
    total_income: "Total Inflow",
    total_expense: "Total Outflow",
    active_pockets: "Active Pockets",
    inspector_title: "Node Inspector",
    inspector_empty: "Click any node on the canvas to inspect its history and flow.",
    inspector_balance: "Current Balance",
    inspector_inflow: "Total Inflow",
    inspector_outflow: "Total Outflow",
    inspector_type: "Node Type",
    inspector_category: "Category",
    inspector_history: "Node Transaction History",
    modal_add_income: "Log New Income",
    modal_add_expense: "Log New Expense",
    modal_transfer: "Transfer Funds Between Pockets",
    modal_add_account: "Create New Pocket / Account",
    lbl_source_name: "Income Source Name",
    lbl_dest_account: "Deposit Into Pocket",
    lbl_expense_name: "Expense Category / Name",
    lbl_source_account: "Pay From Pocket",
    lbl_transfer_from: "Source Pocket (From)",
    lbl_transfer_to: "Target Pocket (To)",
    lbl_amount: "Amount",
    lbl_date: "Date",
    lbl_note: "Note / Description",
    lbl_pocket_name: "Pocket / Wallet Name",
    lbl_pocket_category: "Pocket Type",
    opt_cash: "Cash Pocket (Dompet Fisik)",
    opt_bank: "Bank Account (BCA, Mandiri, etc.)",
    opt_ewallet: "E-Wallet (GoPay, OVO, ShopeePay)",
    opt_savings: "Savings / Emergency",
    btn_cancel: "Cancel",
    btn_save: "Save Transaction",
    btn_save_pocket: "Create Pocket",
    ledger_date: "Date",
    ledger_type: "Type",
    ledger_change: "Change",
    ledger_running: "Balance",
    ledger_from: "Source (From)",
    ledger_to: "Target (To)",
    ledger_note: "Note",
    ledger_actions: "Actions",
    filter_all: "All Transactions",
    filter_income: "Income",
    filter_expense: "Expenses",
    filter_transfer: "Transfers",
    search_placeholder: "Search notes, categories, accounts...",
    no_transactions: "No transactions recorded yet.",
    toast_added: "Transaction recorded successfully!",
    toast_pocket_added: "Pocket created successfully!",
    toast_deleted: "Transaction deleted!",
    confirm_delete: "Are you sure you want to delete this transaction?",
    stat_income_vs_expense: "Income vs Expense",
    stat_spending_breakdown: "Spending by Category",
    stat_pocket_distribution: "Pocket Balance Distribution",
    currency_label: "Currency"
  },
  id: {
    app_title: "Student Pocket Manager",
    app_subtitle: "Pelacak keuangan visual berbasis alur dana",
    mode_simple: "Mode Simple",
    mode_irl: "Mode IRL (Real-life)",
    mode_both: "Mode Both (Total + IRL)",
    view_flow: "Kanvas Alur",
    view_ledger: "Buku Kas",
    view_stats: "Statistik",
    quick_add: "Catat Cepat",
    btn_income: "+ Pemasukan",
    btn_expense: "- Pengeluaran",
    btn_transfer: "⇄ Pindah Saldo",
    btn_account: "+ Kantong Baru",
    export_menu: "Ekspor Data",
    export_csv: "Unduh CSV (Excel/Spreadsheet)",
    export_json: "Unduh Backup JSON",
    export_db: "Unduh Database (.db)",
    total_balance: "Total Saldo Semua Kantong",
    total_income: "Total Dana Masuk",
    total_expense: "Total Dana Keluar",
    active_pockets: "Kantong Aktif",
    inspector_title: "Detail & Alur Node",
    inspector_empty: "Klik salah satu node pada kanvas untuk melihat riwayat dan aliran dananya.",
    inspector_balance: "Saldo Saat Ini",
    inspector_inflow: "Total Dana Masuk",
    inspector_outflow: "Total Dana Keluar",
    inspector_type: "Tipe Node",
    inspector_category: "Kategori",
    inspector_history: "Riwayat Transaksi Node Ini",
    modal_add_income: "Catat Pemasukan Baru",
    modal_add_expense: "Catat Pengeluaran Baru",
    modal_transfer: "Pindah Saldo Antar Kantong",
    modal_add_account: "Buat Kantong / Rekening Baru",
    lbl_source_name: "Sumber Pemasukan (cth: Uang Saku Ortu, Gaji Freelance)",
    lbl_dest_account: "Masuk ke Kantong Mana",
    lbl_expense_name: "Pos Pengeluaran (cth: Makanan, Kosan, Transport)",
    lbl_source_account: "Bayar dari Kantong",
    lbl_transfer_from: "Dari Kantong",
    lbl_transfer_to: "Ke Kantong",
    lbl_amount: "Nominal",
    lbl_date: "Tanggal",
    lbl_note: "Catatan Tambahan (opsional)",
    lbl_pocket_name: "Nama Kantong (cth: Dompet Fisik, Bank BCA, GoPay)",
    lbl_pocket_category: "Tipe Kantong",
    opt_cash: "Uang Tunai / Dompet Fisik",
    opt_bank: "Rekening Bank (BCA, Mandiri, BRI, dll)",
    opt_ewallet: "E-Wallet (GoPay, OVO, ShopeePay, DANA)",
    opt_savings: "Tabungan / Dana Darurat",
    btn_cancel: "Batal",
    btn_save: "Simpan Transaksi",
    btn_save_pocket: "Buat Kantong",
    ledger_date: "Tanggal",
    ledger_type: "Jenis",
    ledger_change: "Nominal",
    ledger_running: "Saldo Berjalan",
    ledger_from: "Dari (Sumber)",
    ledger_to: "Tujuan (Masuk ke)",
    ledger_note: "Catatan",
    ledger_actions: "Aksi",
    filter_all: "Semua Transaksi",
    filter_income: "Pemasukan Saja",
    filter_expense: "Pengeluaran Saja",
    filter_transfer: "Transfer Saja",
    search_placeholder: "Cari catatan, pos pengeluaran, akun...",
    no_transactions: "Belum ada transaksi tercatat.",
    toast_added: "Transaksi berhasil disimpan!",
    toast_pocket_added: "Kantong baru berhasil dibuat!",
    toast_deleted: "Transaksi berhasil dihapus!",
    confirm_delete: "Apakah Anda yakin ingin menghapus transaksi ini?",
    stat_income_vs_expense: "Pemasukan vs Pengeluaran",
    stat_spending_breakdown: "Distribusi Pengeluaran per Kategori",
    stat_pocket_distribution: "Distribusi Saldo per Kantong",
    currency_label: "Mata Uang"
  }
};

class I18nManager {
  constructor() {
    this.currentLocale = localStorage.getItem('spm_locale') || 'id';
    this.currency = this.currentLocale === 'id' ? 'IDR' : 'USD';
  }

  setLocale(locale) {
    if (locale !== 'en' && locale !== 'id') return;
    this.currentLocale = locale;
    this.currency = locale === 'id' ? 'IDR' : 'USD';
    localStorage.setItem('spm_locale', locale);
    this.applyTranslations();
    window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale, currency: this.currency } }));
  }

  t(key) {
    const dict = translations[this.currentLocale] || translations.id;
    return dict[key] || translations.en[key] || key;
  }

  formatCurrency(amount) {
    const num = Number(amount) || 0;
    if (this.currentLocale === 'id') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(num);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }).format(num);
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat(this.currentLocale === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', this.t(key));
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', this.t(key));
    });

    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
      langToggleBtn.textContent = this.currentLocale === 'id' ? '🇮🇩 ID' : '🇺🇸 EN';
    }
  }
}

export const i18n = new I18nManager();
