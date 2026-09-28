// Database Connection & Schema Migration (Brief v04 Section 8.1)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, '../storage');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_FILE || path.join(DB_DIR, 'pocket_master.db');
const db = new Database(DB_PATH);

// Enable WAL mode & foreign keys for high performance & ACID integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      display_name TEXT NOT NULL,
      photo_url TEXT,
      role TEXT CHECK(role IN ('student', 'parent')) NOT NULL DEFAULT 'student',
      preferred_locale TEXT DEFAULT 'id',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Family Relations (Brief v04 Sec 8.1)
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_relations (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      pairing_code TEXT,
      status TEXT CHECK(status IN ('pending', 'active', 'revoked')) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Financial Nodes (Pockets, Income sources, Expense categories)
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT CHECK(type IN ('income', 'account', 'expense', 'transfer')) NOT NULL,
      category TEXT,
      account_category TEXT CHECK(account_category IN ('cash', 'bank', 'e_wallet', 'savings')),
      current_balance REAL DEFAULT 0,
      total_inflow REAL DEFAULT 0,
      total_outflow REAL DEFAULT 0,
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 4. Financial Transactions
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('income', 'expense', 'transfer')) NOT NULL,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'IDR',
      date DATETIME NOT NULL,
      note TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (from_node_id) REFERENCES nodes(id),
      FOREIGN KEY (to_node_id) REFERENCES nodes(id)
    );
  `);

  // 5. Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_tx_nodes ON transactions(from_node_id, to_node_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_user ON nodes(user_id);
  `);

  // Seed default demo users if users table is empty
  seedDemoUsers();
}

function seedDemoUsers() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  if (count > 0) return;

  console.log('🌱 Seeding demo accounts according to Brief v04...');

  const studentPass = bcrypt.hashSync('student123', 10);
  const parentPass = bcrypt.hashSync('parent123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, role, preferred_locale)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('usr_student_1', 'budi.pratama@student.id', studentPass, 'Budi Pratama', 'student', 'id');
  insertUser.run('usr_parent_dad', 'hendra.pratama@gmail.com', parentPass, 'Hendra Pratama (Ayah)', 'parent', 'id');
  insertUser.run('usr_parent_mom', 'dewi.pratama@gmail.com', parentPass, 'Dewi Pratama (Ibu)', 'parent', 'id');

  // Pair parents with Budi
  const insertFamily = db.prepare(`
    INSERT INTO family_relations (id, parent_id, student_id, pairing_code, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertFamily.run('fam_1', 'usr_parent_dad', 'usr_student_1', 'PAIR-BUDI-01', 'active');
  insertFamily.run('fam_2', 'usr_parent_mom', 'usr_student_1', 'PAIR-BUDI-02', 'active');

  // Seed initial pockets for Budi
  const insertNode = db.prepare(`
    INSERT INTO nodes (id, user_id, label, type, account_category, current_balance, total_inflow, total_outflow, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNode.run('pkt_cash_1', 'usr_student_1', 'Dompet Fisik (Cash)', 'account', 'cash', 175000, 300000, 125000, '#10b981');
  insertNode.run('pkt_bca_1', 'usr_student_1', 'Bank BCA', 'account', 'bank', 1850000, 2750000, 900000, '#3b82f6');
  insertNode.run('pkt_gopay_1', 'usr_student_1', 'GoPay / E-Wallet', 'account', 'e_wallet', 125000, 200000, 75000, '#8b5cf6');

  // Seed income sources
  insertNode.run('inc_allowance_1', 'usr_student_1', 'Uang Saku Ortu (Mom/Dad)', 'income', null, 0, 2000000, 0, '#10b981');
  insertNode.run('inc_freelance_1', 'usr_student_1', 'Projek Desain / Freelance', 'income', null, 0, 750000, 0, '#10b981');

  // Seed expense categories
  insertNode.run('exp_food_1', 'usr_student_1', 'Makan & Minum Harian', 'expense', null, 0, 0, 425000, '#ef4444');
  insertNode.run('exp_transport_1', 'usr_student_1', 'Bensin & Transport', 'expense', null, 0, 0, 115000, '#ef4444');
  insertNode.run('exp_campus_1', 'usr_student_1', 'Fotokopi & Buku Kuliah', 'expense', null, 0, 0, 85000, '#ef4444');

  // Seed transactions
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, user_id, type, from_node_id, to_node_id, amount, date, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run('tx_1', 'usr_student_1', 'income', 'inc_allowance_1', 'pkt_bca_1', 2000000, '2026-09-01', 'Uang saku awal bulan');
  insertTx.run('tx_2', 'usr_student_1', 'transfer', 'pkt_bca_1', 'pkt_cash_1', 300000, '2026-09-02', 'Tarik tunai ATM');
  insertTx.run('tx_3', 'usr_student_1', 'transfer', 'pkt_bca_1', 'pkt_gopay_1', 200000, '2026-09-03', 'Top up GoPay');
  insertTx.run('tx_4', 'usr_student_1', 'expense', 'pkt_cash_1', 'exp_food_1', 45000, '2026-09-04', 'Nasi Padang siang');
  insertTx.run('tx_5', 'usr_student_1', 'expense', 'pkt_gopay_1', 'exp_transport_1', 35000, '2026-09-05', 'Gojek ke kampus');

  console.log('✅ Demo accounts seeded successfully.');
}

// Initialize tables on startup
initDatabase();

module.exports = db;
