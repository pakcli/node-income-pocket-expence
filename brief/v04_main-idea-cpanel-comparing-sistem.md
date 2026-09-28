# Student Pocket Manager – Unified Master Specification (v04)
## Full Architecture: Dual-Mode Flow, Table View Accountability, Multi-Saved-Account Switcher, cPanel Deployment & AppSheet Deep Comparison

> **Document Status:** Authoritative Master Reference (Consolidated v01, v02, v03 + Multi-Account Switcher + AppSheet Comparison + cPanel Architecture)  
> **File:** `brief/v04_main-idea-cpanel-comparing-sistem.md`  
> **Target Audience:** Systems Architects, Frontend & Backend Engineers, UI/UX Designers, Product Owners  

---

## 1. Executive Summary & Vision

**Student Pocket Manager** is a modern, visual, flow-based personal finance tracker designed specifically for students and their families. Traditional personal finance tools rely on flat ledger lists or static pie charts that hide the real journey of money: where it originated, which pocket or e-wallet it rested in, how it moved between accounts, and exactly which income source paid for which expense.

This application reimagines personal finance as a **directed flow network (nodes and edges)** with a companion **precision financial ledger (Table View)**.

### Core Architectural Pillars:
1. **Dual Visualization Engines:** 
   - **Simple Mode:** Linear 3-column pipeline (`Income` → `Pocket` → `Expense`).
   - **IRL Mode (In Real Life):** Complex, realistic network graph supporting multi-parent allowances, cross-wallet transfers, and multi-category outflows.
2. **Precision Accountability (Table View):** Audit trail displaying mathematical delta (`changes`), running balance after change (`value`), trend delta (`diff`), and origin/target attribution.
3. **Multi-Account on 1 Server (YES - 100% Multi-Tenant):** Multiple users (students, parents) running securely on a single cPanel host with strict row-level isolation and zero resource waste.
4. **Multi-Saved-Account Switcher (TRUE):** Instant 1-click account switching (Instagram / Google style) on shared family devices without logging out or re-authenticating.
5. **Multi-Language (i18n):** Native bilingual capability (`en` English and `id` Bahasa Indonesia) with localized currency (`IDR Rp` / `USD $`) and date formatters.
6. **Zero-Lock-In Dual Export:** Instant download of personal financial records as **`data.csv`** (spreadsheet) and **`data.db`** (portable SQLite binary database).
7. **cPanel-Native Deployment:** Runs out-of-the-box on standard PHP + SQLite cPanel hosting (like Indowebsite) with zero additional server subscription costs.

---

## 2. Multi-Account on 1 Server & Saved Account Switcher

### 2.1 Multi-Account Running on 1 Server: YES or NO? And Why?

> **Verdict:** **YES, 100% YES.**

Running multiple user accounts on a single server (your cPanel hosting) is the standard industry pattern (Multi-Tenancy) and offers unmatched efficiency:

```
┌────────────────────────────────────────────────────────────────────────┐
│               1 cPanel Server (pinwheel.indowebsite.net)               │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               Auth Gateway (Google JWT + Session)              │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│                  Isolasi Data & Hak Akses (User ID)                    │
│                 ┌──────────────────┼──────────────────┐                │
│                 ▼                  ▼                  ▼                │
│        ┌─────────────────┐┌─────────────────┐┌─────────────────┐       │
│        │  Akun 1: Budi   ││  Akun 2: Ayah   ││  Akun 3: Ibu    │       │
│        │ (Student Mode)  ││ (Parent Monitor)││ (Parent Monitor)│       │
│        └────────┬────────┘└────────┬────────┘└────────┬────────┘       │
│                 │                  │                  │                │
│   ┌─────────────┴──────────────────┴──────────────────┴────────────┐   │
│   │                 SQLite Database Engine (cPanel)                │   │
│   │   • Model A: Shared DB with strict Row-Level Security (RLS)    │   │
│   │   • Model B: Isolated DB per Tenant (user_abc.sqlite)          │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Why it is the Best Choice:
- **Zero Resource Waste:** 2–10 users consume **less than 80 MB RAM** out of your 1,500 MB cPanel allocation. CPU usage remains practically 0–1% idle.
- **Single Domain / SSL:** All family members access the app via a single clean URL (e.g. `pocket.yourdomain.com`).
- **Seamless Parent-Child Linking:** Enables instant pairing via the `family_relations` table without cross-server API calls.

---

### 2.2 Multi-Account "Saved Account" Switcher: BISA (TRUE)?

> **Verdict:** **BISA, 100% TRUE!**

On shared family tablets, laptops, or smartphones, users can save multiple logged-in accounts and switch between them in **1 click**, exactly like Google or Instagram Account Switchers:

```
┌────────────────────────────────────────────────────────┐
│  [Avatar] Budi (Student)                          ▼    │
├────────────────────────────────────────────────────────┤
│  SAVED ACCOUNTS (AKUN TERSIMPAN):                      │
│                                                        │
│  ● Budi Pratama (Student)                 [ACTIVE]     │
│  ○ Hendra Pratama (Ayah - Parent)         [SWITCH]     │
│  ○ Dewi Pratama (Ibu - Parent)            [SWITCH]     │
│                                                        │
│  ----------------------------------------------------  │
│  ➕ Add Another Account (Tambah Akun)                  │
│  🚪 Sign Out of All Accounts                           │
└────────────────────────────────────────────────────────┘
```

#### Technical Implementation of Saved Account Switcher:
1. When a user logs in via Google Auth, the application stores a lightweight session descriptor in encrypted browser storage (`localStorage`):
   ```typescript
   interface SavedAccount {
     userId: string;
     email: string;
     displayName: string;
     role: 'student' | 'parent';
     avatarUrl?: string;
     sessionToken: string;
     lastActive: number;
   }
   ```
2. When the user taps **[SWITCH]** on another profile:
   - React state updates the active `sessionToken` instantly (< 50ms).
   - The UI re-queries the SQLite backend for the newly active `userId`.
   - **No login prompt or password typing required.**
3. If an account session expires, the UI prompts for a quick 1-click Google re-auth for that specific profile only.

---

## 3. Dual-Mode Visual Flow Graph (Simple vs. IRL)

Users can toggle seamlessly between two visual flow paradigms:

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

### Visual Topology Comparison

| Feature | Mode 1: Simple View | Mode 2: IRL View |
| :--- | :--- | :--- |
| **Topology** | 3-Column Linear Pipeline (In → Pocket → Out) | Unconstrained Directed Network Graph |
| **Account Nodes** | Aggregated / Unified Pocket Node | Discrete accounts (Cash, BCA, GoPay, OVO) |
| **Transfers** | Hidden / Implicit | Explicit directed edges between accounts |
| **Primary Use Case** | Fast daily check, simple mental model | Deep auditing, multi-wallet rebalancing |
| **Graph Engine** | Fixed column layout / DAG | Interactive React Flow (@xyflow/react) |

---

## 4. Why Table View? Precision Accountability & Bank Reconciliation

While the Graph Canvas provides spatial understanding, **Table View is indispensable for accountability**:

```
GRAFIK ALUR (Canvas)                TABEL RIWAYAT (Table View)
┌──────────────────────┐            ┌─────────────────────────────────────────┐
│ [Mom] ──→ [Dompet A] │            │ Tanggal  │ Perubahan │ Saldo   │ Kategori   │
│              │       │     VS     ├──────────┼───────────┼─────────┼────────────┤
│              └──→ Mkn│            │ 28/09/26 │ +200.000  │ 250.000 │ Uang Saku  │
│                      │            │ 28/09/26 │  -45.000  │ 205.000 │ Makan Siang│
└──────────────────────┘            └─────────────────────────────────────────┘
   FUNGSI: Pemahaman Alur              FUNGSI: Akuntabilitas & Audit Finansial
```

### 4.1 Four Reasons Table View is Mandatory:
1. **Mathematical Audit Trail:** Displays exact running balance after every single transaction (`value`), preventing discrepancies.
2. **Bank Reconciliation:** Line-by-line verification against physical BCA/Mandiri mutasi or GoPay history.
3. **High-Speed Filtering:** Instantly filter by date ranges, categories (e.g. "Food"), or individual pockets.
4. **Receipt Itemization:** Displays sub-item breakdowns (e.g. "Roti x2, Kopi x1") within an expandable drawer.

### 4.2 Table Ledger Columns Specification

| Column | Type | Formatting | Description | Localized Translation Key |
| :--- | :--- | :--- | :--- | :--- |
| **Date** | Date | `YYYY-MM-DD` | Transaction execution date | `ledger.col_date` ("Date" / "Tanggal") |
| **Changes** | Number | `+Rp 200.000` (Green) / `-Rp 50.000` (Red) | Delta applied to this pocket | `ledger.col_changes` ("Changes" / "Perubahan") |
| **Value** | Number | `Rp 250.000` | Running balance immediately following change | `ledger.col_value` ("Balance" / "Saldo") |
| **Diff** | Number | `+200k` / `-50k` | Visual trend delta indicator | `ledger.col_diff` ("Diff" / "Selisih") |
| **Input Node** | String | Origin node label | Source of funds (e.g. Mom, Bank BCA) | `ledger.col_input` ("From" / "Dari") |
| **Output Node**| String | Destination node label | Destination of funds (e.g. Pocket A, Food) | `ledger.col_output` ("To" / "Tujuan") |
| **Node Assigned**| String | Assigned account label | Pocket owning this ledger entry | `ledger.col_assigned` ("Pocket" / "Dompet") |

---

## 5. Head-to-Head Comparison: Custom Table View vs. Google AppSheet

| Dimension | Custom System (React + SQLite + cPanel) | Google AppSheet (Google Cloud No-Code) |
| :--- | :--- | :--- |
| **Subscription Cost** | **Rp 0 / Flat** — Runs on your existing Indowebsite cPanel. | **Expensive:** Free only for prototype (max 10 test users). Production costs **$5 to $10 / user / month** (~Rp 80k–160k/user/bln). |
| **Visual Flow Graph (Xyflow)** | **✅ NATIVE:** 2D interactive canvas with draggable nodes, glowing flow particles, and dual-mode layouts. | **❌ IMPOSSIBLE:** AppSheet only renders rigid tables, standard forms, and simple bar/pie charts. No flow graph capability. |
| **Multi-Saved-Account Switcher** | **✅ TRUE:** Instant 1-click switching between Student, Dad, and Mom profiles on the same device without re-login. | **❌ RIGID / IMPOSSIBLE:** AppSheet is tied strictly to the browser's active Google account. Switching accounts requires logging out of Google. |
| **Split View (Graph + Table)** | **✅ YES:** Side-by-side interactive split view. Clicking a table row highlights the node on the graph in real time. | **❌ NO:** Disconnected list views only. |
| **Data Ownership & Privacy** | **✅ TOTAL SOVEREIGNTY:** SQLite database stored on your private server. No third-party data tracking. | **⚠️ Google Dependent:** Data stored on Google Sheets or Cloud SQL; subject to Google API quotas and terms. |
| **Export Capabilities** | **✅ DUAL EXPORT:** One-click download of both `data.csv` and native standalone `data.db` (SQLite). | **⚠️ CSV Only:** Cannot export a portable standalone SQL database. |
| **Performance & Latency** | **✅ Instant (< 50ms):** In-memory React rendering + local SQLite file queries. | **⚠️ Sluggish (1–3 seconds):** Constant cloud sync rounds back to Google Sheets. |
| **UI & Theming Freedom** | **✅ 100% Custom:** Sleek fintech dark mode, custom badges, micro-animations with Framer Motion. | **❌ Generic Enterprise:** Fixed corporate look and feel; very limited CSS styling. |
| **Offline Inspection** | **✅ TRUE:** Downloaded `data.db` opens in DB Browser for SQLite on any laptop without internet. | **❌ Online Required:** Relies on cloud connection to function reliably. |

---

## 6. Multi-Language (i18n) Architecture

The application is completely bilingual from day one with instantaneous locale switching:

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

## 7. Dual Export Engine: `data.csv` & `data.db`

Users maintain complete data sovereignty with two export formats available directly from the top navigation bar:

```
┌──────────────────────────────────────┐
│  📥 Export Financial Data            │
├──────────────────────────────────────┤
│  📄 1. Export as Spreadsheet (.csv)   │
│     File: student-pocket-data.csv    │
├──────────────────────────────────────┤
│  🗄️ 2. Export as SQLite DB (.db)     │
│     File: student-pocket-data.db     │
└──────────────────────────────────────┘
```

1. **`data.csv` (Spreadsheet):** Standard RFC 4180 CSV containing chronological transactions, categories, input/output labels, and running balance.
2. **`data.db` (Portable SQLite Database):** Generates a complete, isolated binary SQLite database file containing the user's personal tables (`nodes`, `transactions`, `detail_items`). Can be opened in DB Browser for SQLite, DBeaver, or Python scripts.

---

## 8. cPanel Production Deployment Architecture

This application is designed to deploy cleanly to your **Indowebsite cPanel** without paying for additional VPS infrastructure:

```
public_html/ (Hosting Indowebsite cPanel)
│
├── index.html                 <-- Frontend React SPA (Compiled Vite Bundle)
├── assets/                    <-- Static JS/CSS, Lucide Icons, Xyflow Engine
│
└── api/                       <-- Lightweight Backend REST API (PHP PDO)
    ├── .htaccess              <-- Security: Deny all direct web access to .sqlite!
    ├── index.php              <-- Unified API Router (Auth, CRUD, Sync, Export)
    ├── auth.php               <-- Google ID Token verification
    ├── export_csv.php         <-- Streams data.csv download
    ├── export_db.php          <-- Streams data.db download
    │
    └── storage/               <-- Protected Data Directory
        └── pocket_master.db   <-- SQLite Database File
```

### 8.1 SQLite Database Schema (`schema.sql`)

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

-- Family Relations (Parent-Child Pairing)
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

-- Financial Nodes (Pockets, Income, Expenses, Transfers)
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Financial Transactions
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

-- Indexes for ultra-fast query execution
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_nodes ON transactions(from_node_id, to_node_id);
CREATE INDEX IF NOT EXISTS idx_nodes_user ON nodes(user_id);
```

### 8.2 Security .htaccess for SQLite Protection
Place this file in `api/storage/.htaccess` to guarantee no external visitor can download your database directly:
```apache
<Files "*.db">
    Order Deny,Allow
    Deny from all
</Files>
<Files "*.sqlite">
    Order Deny,Allow
    Deny from all
</Files>
```

---

## 9. Technology Stack Summary

| Layer | Chosen Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React + Vite (TypeScript)** | Ultra-fast client rendering, easy static build deployment to cPanel |
| **Flow Graph Engine** | **@xyflow/react (React Flow)** | Interactive nodes, custom bezier handles, dual-mode layout engine |
| **Styling & Icons** | **Tailwind CSS + Lucide Icons** | Modern fintech dark mode, responsive desktop/mobile layouts |
| **Internationalization** | **React i18n Context (`en.json`, `id.json`)** | Instant language switch (`🇺🇸 EN` / `🇮🇩 ID`), localized currency & dates |
| **State & Account Switcher**| **Zustand + LocalStorage** | Manages multi-saved-account profiles with instant 1-click switching |
| **Backend API** | **PHP 8.x PDO REST API (or Node.js)** | 100% native on Indowebsite cPanel, zero server setup, rock solid |
| **Database** | **SQLite (WAL Mode)** | Embedded, zero latency, ultra-lightweight (< 15 MB RAM), portable single file |
| **Data Export** | **Dual Engine (`data.csv` & `data.db`)** | Client-side CSV generation + server-side isolated SQLite `.db` streaming |
| **Authentication** | **Google Identity Services (OAuth 2.0)** | Frictionless Google login for students and parents |

---

## 10. Developer Implementation Roadmap & Checklist

- [ ] **Phase 1: Project Scaffolding & Setup**
  - [ ] Initialize `frontend/` with Vite + React + TypeScript + Tailwind CSS.
  - [ ] Initialize `backend/` with PHP REST API + SQLite connection helper.
- [ ] **Phase 2: Database & Authentication**
  - [ ] Create SQLite schema (`users`, `family_relations`, `nodes`, `transactions`).
  - [ ] Integrate Google OAuth login and multi-saved-account switcher in React.
- [ ] **Phase 3: Visual Flow Graph (Dual Mode)**
  - [ ] Implement Simple Mode (3-column linear layout).
  - [ ] Implement IRL Mode (network graph with custom pocket/expense nodes).
- [ ] **Phase 4: Table View & Node Inspector**
  - [ ] Build desktop persistent sidebar inspector (380px) and mobile modal sheet.
  - [ ] Implement precision transaction ledger with `Date`, `Changes`, `Balance`, `Diff`.
- [ ] **Phase 5: Multi-Language & Dual Export**
  - [ ] Connect `useI18n` with English and Indonesian dictionary keys.
  - [ ] Implement `data.csv` generator and `data.db` SQLite snapshot downloader.
- [ ] **Phase 6: cPanel Deployment Validation**
  - [ ] Build React frontend to `dist/` and configure for `public_html/`.
  - [ ] Configure `api/` endpoint and verify `.htaccess` SQLite file protection.
