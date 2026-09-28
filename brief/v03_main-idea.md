# Student Pocket Manager – Unified Master Product & Technical Brief (v03)

> **Document Status:** Master Reference (Consolidated v01 Product Brief + v02 UI/UX Architecture + Multi-Language i18n + Node.js/SQLite Backend & Dual Export Specification + Hosting Evaluation)  
> **Target Audience:** Frontend Engineers, Backend Engineers, DevOps, UI/UX Designers, Product Owners  

---

## 1. Executive Summary & Vision

**Student Pocket Manager** is a visual, flow-based personal finance tracker tailored for students and their parents. Traditional budgeting apps rely on static ledger rows and pie charts that fail to convey how money actually travels into, between, and out of a student's hands.

This product conceptualizes personal finance as a **directed flow network (nodes and edges)**:
- **Income sources** pour money into **Pockets and Accounts**.
- Money moves laterally via **Transfers** across cash, bank accounts, and e-wallets.
- Money exits through **Expense Categories** and granular line items.

The platform is designed around 4 core technical pillars:
1. **Dual Visualization Engines:** Simple Mode (linear 3-column flow) and IRL Mode (realistic network graph).
2. **Multi-Language (i18n):** Native bilingual support (English `en` & Indonesian `id`), localized currency (IDR `Rp` / USD `$`), and date formats.
3. **Node.js + SQLite Core:** High-performance, lightweight, self-contained relational backend using Node.js and SQLite.
4. **Dual Data Export Freedom:** Instant user backup in both **`data.csv`** (spreadsheet-ready) and **`data.db`** (native, portable SQLite database file).

---

## 2. Target Personas & Core Journeys

### 2.1 The Student (Primary Operator)
- **Log Daily Transactions:** Effortlessly log allowances, freelance earnings, daily food, transport, and leisure expenses.
- **Track Multi-Account Balances:** See how much is physically in cash vs. Bank A vs. e-wallets (GoPay, OVO, ShopeePay, GCash).
- **Trace Money Flow:** Understand exactly which income paid for which expense through visual node edges.
- **Deep Node Inspection:** Click any pocket or expense category to review chronological balance changes and source-target attribution.
- **Complete Data Ownership:** Download their entire ledger at any time as `data.csv` or a standalone `data.db` file.
- **Language Preference:** Toggle the interface between Bahasa Indonesia and English with instant persistence.

### 2.2 The Parent (Monitor & Sponsor)
- **Google Sign-In & Family Pairing:** Easily link to one or more student accounts using a secure pairing code.
- **Activity & Balance Visibility:** Review overall financial health, high-level spending breakdowns, and transfer behaviors.
- **Audit & Export:** View live updates and export student records as `data.csv` or `data.db` for offline family accounting.

---

## 3. Dual-Mode Visualization Concept

The user can toggle seamlessly between two graph layouts:

```
MODE 1: SIMPLE (Linear Left → Right)
┌────────────────────────────────────────────────────────┐
│   [ Income Nodes ]   →   [ Pocket Node ]   →   [ Expense Nodes ] │
│     (Stacked)              (Balance)              (Stacked)      │
└────────────────────────────────────────────────────────┘
  Clean, structured, beginner-friendly, predictable.

MODE 2: IRL (Real-Life Complex Network Graph)
┌────────────────────────────────────────────────────────┐
│  Mom Allowance ─────┐                                  │
│  Dad Allowance ─────┼──→ [Pocket Cash] ────→ Food      │
│  Freelance Work ────┤                  ────→ Transport │
│  E-Wallet / GCash ──┼──→ [Bank Account] ───→ Shopping  │
│  Bank Transfer ─────┘         │                        │
│                               └───→ Transfer to Wallet │
│  [Dynamic, realistic, multi-in/multi-out network graph] │
└────────────────────────────────────────────────────────┘
  Honest representation of real financial movement.
```

### Mode Comparison Matrix

| Feature | Mode A: Simple View | Mode B: IRL View |
| :--- | :--- | :--- |
| **Topology** | 3-Column Linear Pipeline (Income → Account → Expense) | Unconstrained Directed Network Graph |
| **Account Nodes** | Aggregated / Unified Pocket Node | Discrete accounts (Cash, Bank A, E-Wallet B) |
| **Transfers** | Hidden / Implicit | Explicit directed edges between accounts |
| **Primary Use Case** | Fast overview, simple daily check, easy digestion | Exact auditing, complex flows, multiple wallets |
| **Graph Engine** | Fixed column layout / DAG | Force-directed or layered custom React Flow graph |

---

## 4. UI / UX & Responsive Interaction Architecture

### 4.1 Master Workspace Layouts

```
DESKTOP & TABLET VIEW (≥ 768px):
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Top Navbar: [Logo] [Mode: Simple | IRL] [View Modes] [🌐 EN/ID] [Export] [User Profile] │
├────────────────────────────────────────────────────┬────────────────────────────────────┤
│                                                    │ SIDEBAR INSPECTOR (Fixed 380px)    │
│                                                    ├────────────────────────────────────┤
│                                                    │ Node: Pocket A (Cash)              │
│               FLOW CANVAS / GRAPH                  │ Balance: Rp 250.000                │
│                                                    ├────────────────────────────────────┤
│         [Income] ──→ [Pocket] ──→ [Expense]        │ TRANSACTION HISTORY TABLE          │
│                                                    │ Date  | Change | Value | Src / Dst │
│                                                    │ ---------------------------------- │
│         (Pan, Zoom, Drag, Node Click)              │ 09/15 | +200k  | 250k  | Mom       │
│                                                    │ 09/16 | -50k   | 200k  | Food      │
│                                                    ├────────────────────────────────────┤
│                                                    │ Connected Inputs & Outputs         │
└────────────────────────────────────────────────────┴────────────────────────────────────┘

MOBILE VIEW (< 768px):
┌────────────────────────────────────────┐
│ Top Header: [Mode] [🌐 EN/ID] [Export] │
├────────────────────────────────────────┤
│                                        │
│          FLOW CANVAS (Touch)           │
│                                        │
│   [Tap Node] ───────┐                  │
│                     ↓                  │
├────────────────────────────────────────┤
│ BOTTOM SHEET / POPUP DIALOG            │
│ ┌────────────────────────────────────┐ │
│ │ Pocket A — Balance: Rp 250.000     │ │
│ │ Transaction Table (Swipeable/Scroll)│ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

## 5. Node Inspector & Financial Ledger Table

Every node in the graph acts as an account ledger. Clicking a node loads its granular history:

### 5.1 Ledger Columns Specification

| Column | Type | Formatting | Description | Localized Translation Keys |
| :--- | :--- | :--- | :--- | :--- |
| **Date** | Date / String | `YYYY-MM-DD` or `MM/DD` | Transaction execution date | `ledger.col_date` ("Date" / "Tanggal") |
| **Changes** | Number | `+Rp 200.000` (Green) / `-Rp 50.000` (Red) | Delta applied to this node's balance | `ledger.col_changes` ("Changes" / "Perubahan") |
| **Value** | Number | `Rp 250.000` | Running balance immediately following change | `ledger.col_value` ("Balance" / "Saldo") |
| **Diff** | Number (Optional) | `+200k` / `-50k` | Visual trend delta indicator | `ledger.col_diff` ("Diff" / "Selisih") |
| **Input Node** | String / ID | Label of origin node | Source of funds (e.g., Mom, Bank C, Freelance) | `ledger.col_input` ("From" / "Dari") |
| **Output Node**| String / ID | Label of target node | Destination of funds (e.g., Pocket A, Food) | `ledger.col_output` ("To" / "Tujuan") |
| **Node Assigned** | String / ID | Label of current node | Node context ledger owner | `ledger.col_assigned` ("Node" / "Akun Terkait") |

### 5.2 Ledger Sample Data

```
┌────────────┬─────────────┬─────────────┬─────────────┬──────────────┬──────────────┬────────────────┐
│ Date       │ Changes     │ Value       │ Diff        │ Input Node   │ Output Node  │ Node Assigned  │
├────────────┼─────────────┼─────────────┼─────────────┼──────────────┼──────────────┼────────────────┤
│ 2026-09-15 │ +Rp 200.000 │ Rp 250.000  │ +200.000    │ Mom          │ Pocket A     │ Pocket A       │
│ 2026-09-16 │ -Rp  50.000 │ Rp 200.000  │  -50.000    │ Pocket A     │ Food         │ Food           │
│ 2026-09-17 │ +Rp 100.000 │ Rp 300.000  │ +100.000    │ Bank C       │ Pocket A     │ Pocket A       │
│ 2026-09-18 │ -Rp  40.000 │ Rp 260.000  │  -40.000    │ Pocket A     │ Transport    │ Transport      │
│ 2026-09-19 │ +Rp 150.000 │ Rp 410.000  │ +150.000    │ Freelance    │ Pocket A     │ Pocket A       │
│ 2026-09-20 │ -Rp  80.000 │ Rp 330.000  │  -80.000    │ Pocket A     │ Shopping     │ Shopping       │
└────────────┴─────────────┴─────────────┴─────────────┴──────────────┴──────────────┴────────────────┘
```

---

## 6. Internationalization (i18n) & Multi-Language Architecture

The web app is architected to be **100% translatable and locale-aware**. All user-facing strings, system prompts, category names, date formats, and currencies are localized.

### 6.1 Supported Locales & Formatters
- **`en` (English - US / Global)**: Currency `USD ($)`, Date `MM/DD/YYYY`.
- **`id` (Bahasa Indonesia)**: Currency `IDR (Rp)`, Date `DD/MM/YYYY`.

```typescript
export type SupportedLocale = 'en' | 'id';

export function formatCurrency(amount: number, locale: SupportedLocale = 'id', currency: string = 'IDR'): string {
  return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: locale === 'id' ? 0 : 2,
  }).format(amount);
}

export function formatDate(dateString: string, locale: SupportedLocale = 'id'): string {
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}
```

---

## 7. Backend Architecture: Node.js + SQLite Engine

The backend runs on **Node.js (Express or Fastify with TypeScript)** connected to an embedded, ultra-fast **SQLite database** using `better-sqlite3` or `Drizzle ORM`.

### 7.1 Why SQLite for Student Pocket Manager?
- **Blazing Fast In-Process Execution:** Zero network latency between Node.js and the database engine (< 0.1ms query times).
- **Extremely Low Memory Footprint:** Node.js consumes ~60–120 MB RAM; SQLite in WAL mode consumes < 15 MB RAM. Perfect for entry-level VPS environments.
- **Portability & Zero Admin:** The entire database is a standard single file on disk, making backups, migrations, and user exports trivial.
- **ACID Compliant:** Supports robust transactions (crucial when transferring money between two accounts).

### 7.2 SQLite Schema Definition (`schema.sql`)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    photo_url TEXT,
    role TEXT CHECK(role IN ('student', 'parent')) NOT NULL DEFAULT 'student',
    preferred_locale TEXT DEFAULT 'id',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Family Pairing / Relations
CREATE TABLE IF NOT EXISTS family_relations (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'active', 'revoked')) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Financial Nodes (Income, Account, Expense, Transfer)
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
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transactions (Edges / Financial Events)
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

-- Detail Line Items (Receipt Breakdown)
CREATE TABLE IF NOT EXISTS detail_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_nodes ON transactions(from_node_id, to_node_id);
CREATE INDEX IF NOT EXISTS idx_nodes_user ON nodes(user_id);
```

### 7.3 Real-time Node Sync via Server-Sent Events (SSE) or WebSocket
Instead of polling, the Node.js backend broadcasts balance changes to active browser sessions using lightweight **Server-Sent Events (SSE)** (`GET /api/stream/events`) or **WebSockets**. Whenever a transaction is logged, the impacted nodes emit an update payload, refreshing the React canvas instantly.

---

## 8. Dual Data Export Specification (`data.csv` & `data.db`)

The application offers two distinct export channels under the `[Export]` dropdown menu:

```
┌─────────────────────────────────┐
│ 📥 Export Financial Data        │
├─────────────────────────────────┤
│ 📄 1. Export as Spreadsheet (CSV)│
│    File: student-pocket-data.csv │
├─────────────────────────────────┤
│ 🗄️ 2. Export as SQLite DB (.db)  │
│    File: student-pocket-data.db  │
└─────────────────────────────────┘
```

### 8.1 Export Format 1: `data.csv`
A human-readable spreadsheet file following RFC 4180:
- **Filename:** `student-pocket-export-YYYY-MM-DD.csv`
- **MIME Type:** `text/csv`
- **Columns:**
  ```csv
  date,type,amount,currency,category,source_node,target_node,description,note,account_balance_after,user_name,user_role
  ```
- **Sample Output:**
  ```csv
  2026-09-10,income,200000,IDR,allowance,Mom,Pocket A,Weekly allowance,,200000,"Budi Student",student
  2026-09-12,expense,50000,IDR,food,Pocket A,Food,Lunch with classmate,2x Roti 1x Kopi,150000,"Budi Student",student
  2026-09-14,transfer,50000,IDR,transfer,Pocket A,GCash,E-Wallet Topup,,100000,"Budi Student",student
  ```

### 8.2 Export Format 2: `data.db` (Portable SQLite Database File)
A complete, standalone SQLite database file containing all personal records belonging to the requesting user:
- **Filename:** `student-pocket-export-YYYY-MM-DD.db`
- **MIME Type:** `application/vnd.sqlite3` or `application/octet-stream`
- **Generation Mechanism (Backend Node.js):**
  1. User clicks **"Export SQLite (.db)"**.
  2. The Node.js server generates a temporary in-memory or scratch SQLite database using `better-sqlite3`.
  3. It clones the schema (`users`, `nodes`, `transactions`, `detail_items`).
  4. It populates the temporary database with only the requesting user's records (isolated, secure, zero leakage of other users).
  5. The server streams the binary `.db` buffer directly to the client browser as a file download.
  6. The downloaded `data.db` can be immediately opened in any tool (DB Browser for SQLite, DBeaver, Python scripts, or re-imported into another instance).

#### Backend Node.js Export Endpoint Code Sample:
```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

export async function handleExportSqlite(req: Request, res: Response) {
  const userId = req.user.id;
  const tempDbPath = path.join('/tmp', `export-${userId}-${Date.now()}.db`);

  try {
    const exportDb = new Database(tempDbPath);
    exportDb.exec(SCHEMA_SQL); // Apply clean schema

    // Fetch user's nodes and transactions from main database
    const nodes = mainDb.prepare('SELECT * FROM nodes WHERE user_id = ?').all(userId);
    const txs = mainDb.prepare('SELECT * FROM transactions WHERE user_id = ?').all(userId);

    const insertNode = exportDb.prepare(`
      INSERT INTO nodes (id, user_id, label, type, category, account_category, current_balance)
      VALUES (@id, @user_id, @label, @type, @category, @account_category, @current_balance)
    `);
    const insertManyNodes = exportDb.transaction((rows) => {
      for (const row of rows) insertNode.run(row);
    });
    insertManyNodes(nodes);

    const insertTx = exportDb.prepare(`
      INSERT INTO transactions (id, user_id, type, from_node_id, to_node_id, amount, currency, date, note)
      VALUES (@id, @user_id, @type, @from_node_id, @to_node_id, @amount, @currency, @date, @note)
    `);
    const insertManyTxs = exportDb.transaction((rows) => {
      for (const row of rows) insertTx.run(row);
    });
    insertManyTxs(txs);

    exportDb.close();

    // Stream .db file
    res.download(tempDbPath, `student-pocket-export-${new Date().toISOString().slice(0, 10)}.db`, () => {
      fs.unlinkSync(tempDbPath); // Cleanup
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate SQLite export' });
  }
}
```

---

## 9. Hosting & Infrastructure Evaluation: Indowebsite vs. Google Cloud

The user provided the following hosting specification from **Indowebsite**:

```
Indowebsite Basic Plan:
- Pricing: Rp 48.278 / month (Total Rp 1.738.000 paid for 3 years)
- 6 GB SSD Storage
- Unlimited Data Transfer
- 1 Core CPU
- 1536 MB (1.5 GB) RAM
- Unlimited MySQL, FTP, Email Accounts, Free SSL
- cPanel / CloudLinux environment
```

And asked: **"Is this good enough? Compare Indowebsite vs Google Cloud ($300 Free Credit)."**

### 9.1 Technical Viability: "Is Indowebsite Basic Good Enough?"

**Answer: YES, but with important technical caveats.**

#### The Good:
1. **CPU & RAM (1 Core, 1.5 GB RAM):**
   - Node.js (Express/Fastify) requires only ~60–120 MB RAM.
   - SQLite in WAL mode requires < 15 MB RAM.
   - 1.5 GB RAM is **more than enough** to handle 5,000+ active student ledger updates daily.
2. **Storage (6 GB SSD):**
   - SQLite is extraordinarily compact. A database with 100,000 transactions occupies less than **25 MB**.
   - 6 GB SSD leaves plenty of room for Node runtime dependencies, logs, and database files.

#### The Risks & Limitations:
1. **Shared Hosting (cPanel) vs Pure Linux VPS:**
   - The specifications mentioned (*"Unlimited MySQL, FTP, Email, cPanel"*) indicate this is a **cPanel Shared Hosting / Cloud Hosting** plan, **NOT a full root Linux VPS**.
   - In cPanel, Node.js runs via CloudLinux's **Phusion Passenger**. This means:
     - You do **not** have full root access (`sudo`).
     - Persistent daemon runners like `pm2` might be restricted or killed if memory limits are exceeded.
     - WebSocket support on shared cPanel can be temperamental or blocked by default Apache/Nginx proxy configurations (Server-Sent Events / SSE works better).
2. **3-Year Lock-In:**
   - Paying Rp 1.738.000 upfront locks you in for 36 months before proving the product-market fit or server reliability.

---

### 9.2 Head-to-Head Comparison: Indowebsite vs. Google Cloud Platform (GCP)

| Metric | Indowebsite Basic (cPanel/Cloud Hosting) | Google Cloud Platform ($300 Free Credit) |
| :--- | :--- | :--- |
| **Type** | Managed cPanel / Cloud Hosting | Full Root Linux VM (Compute Engine `e2-micro` / `e2-small`) |
| **Initial Cost** | Rp 1.738.000 (Upfront for 3 Years) | **Rp 0** (Free $300 USD credit valid for 90 days) |
| **Long-Term Cost** | ~Rp 48.000 / month | `e2-micro` is **Always Free Tier** (~$0/mo) in US regions; or ~$7–$15/mo in Jakarta (`asia-southeast2`) |
| **CPU & RAM** | 1 Core CPU, 1.5 GB RAM | `e2-micro` (2 vCPU burstable, 1 GB RAM) or `e2-small` (2 vCPU, 2 GB RAM) |
| **Storage** | 6 GB SSD | 30 GB Persistent Disk (Free Tier included) |
| **Root Access & Control** | ❌ No root (`sudo`), restricted to cPanel UI | ✅ Full `root` SSH, full Linux OS (Ubuntu 24.04 LTS, Debian) |
| **Node.js Execution** | Via cPanel Phusion Passenger (can be quirky) | Native Node.js + PM2 daemon + Nginx reverse proxy |
| **SQLite WAL Support** | Works, but shared NFS disk locks can be an issue | ✅ Native ext4 local disk with flawless POSIX file locking |
| **WebSocket / SSE** | Limited / depends on cPanel proxy config | ✅ 100% full support for WebSockets, SSE, HTTP/2 |
| **Automated Backups** | Included in cPanel | Automated GCP persistent disk snapshots |
| **DevOps Effort** | Low (Point & click cPanel) | Medium (Setup Nginx, Certbot SSL, systemd/PM2) |

---

### 9.3 Definitive Recommendation & Staged Strategy

> [!TIP]
> **Recommended Strategy: Start with Google Cloud $300 Credit (or GCP Always Free Tier), then evaluate Indowebsite / Local VPS.**

1. **Phase 1: Development & Beta Launch (Months 1–3) → Google Cloud ($300 Credit)**
   - Sign up for Google Cloud with your Gmail to claim the **$300 free trial credit**.
   - Deploy a Compute Engine instance:
     - Machine: `e2-small` (2 vCPUs, 2.0 GB RAM) or `e2-micro` (Always Free Tier).
     - Region: `asia-southeast2` (Jakarta) for ultra-low latency (< 15ms in Indonesia).
     - OS: Ubuntu 24.04 LTS.
     - Stack: Node.js 22 LTS + PM2 + SQLite (WAL mode) + Nginx + Let's Encrypt SSL.
   - **Cost during Beta:** **Rp 0** (Covered 100% by the $300 credit).

2. **Phase 2: Production Decision (Month 4 onwards)**
   - If you want a local Indonesian server without large upfront commitments:
     - You do **not** need to pay 3 years upfront to Indowebsite. You can get an unmanaged Linux VPS from providers like **IDCloudHost**, **Biznet Gio**, or **DomaiNesia** starting at **Rp 50.000 – Rp 80.000 / month paid monthly** with full root access.
   - If you choose **Indowebsite**, contact their sales team to ensure you are purchasing a **Cloud VPS KVM (with Root SSH)**, rather than standard Shared Web Hosting, so your Node.js + SQLite setup runs without cPanel restrictions.

---

## 10. Complete Technology Stack Summary

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React / Next.js (TypeScript)** | Fluid component hierarchy, fast client rendering |
| **Graph Engine** | **@xyflow/react (React Flow)** | Visual nodes, custom handles, draggable bezier edges |
| **Styling & UI** | **Vanilla CSS + Tailwind CSS + Lucide Icons** | Dark mode first, fintech dashboard aesthetic, micro-animations |
| **Internationalization** | **React i18n Context (`locales/en.json`, `locales/id.json`)** | 100% bilingual UI, dynamic currency (`Rp` vs `$`) and date formatting |
| **Backend Runtime** | **Node.js (Express or Fastify) + TypeScript** | Asynchronous, event-driven, minimal footprint |
| **Database** | **SQLite (`better-sqlite3` in WAL mode)** | Embedded, zero network lag, single-file portability, ACID safety |
| **Data Export** | **Dual Export: CSV (`data.csv`) & SQLite (`data.db`)** | Complete data sovereignty and portable backup |
| **Real-time Sync** | **Server-Sent Events (SSE) / WebSocket** | Instant canvas update upon logging transactions |
| **Authentication** | **Google OAuth 2.0 (Google Identity Services + JWT)** | Frictionless student & parent sign-in |
| **Deployment Target** | **GCP Compute Engine (Jakarta) or Root Linux VPS** | High availability, full control over PM2 & SQLite files |

---

## 11. Acceptance Criteria & Developer Checklist

- [ ] **Google OAuth Authentication:** Clean login flow; distinction between `student` and `parent` roles.
- [ ] **Node.js + SQLite Core:**
  - [ ] Database initialised with WAL mode enabled (`PRAGMA journal_mode = WAL;`).
  - [ ] Tables created: `users`, `family_relations`, `nodes`, `transactions`, `detail_items`.
  - [ ] Foreign keys enforced (`PRAGMA foreign_keys = ON;`).
- [ ] **Dual Mode Graph Rendering:**
  - [ ] **Simple Mode:** Linear 3-column layout (Income → Pocket → Expense).
  - [ ] **IRL Mode:** Dynamic directed network graph showing transfers and multi-account connections.
- [ ] **Multi-Language (i18n):**
  - [ ] Instant navbar language switcher (`🇺🇸 EN` / `🇮🇩 ID`).
  - [ ] Dynamic currency formatting (`IDR Rp 250.000` vs `USD $25.00`).
  - [ ] All ledger columns, modal dialogues, and node labels translatable.
- [ ] **Dual Export Engine:**
  - [ ] **`data.csv`:** Generates standard RFC 4180 CSV export with transaction history and node balances.
  - [ ] **`data.db`:** Generates and downloads a clean, standalone SQLite database containing user data.
- [ ] **Node Inspector & Ledger:**
  - [ ] Clicking any node displays transaction history with `Changes (+/-)`, `Running Balance`, and `Input/Output`.
  - [ ] Desktop sidebar (380px) and Mobile bottom sheet layout.
- [ ] **Real-time Canvas Sync:** Node balance updates reflect instantly on the UI without manual page reloads.
- [ ] **Infrastructure Readiness:** Node.js app production-ready with PM2 process manager and Nginx reverse proxy configuration.
