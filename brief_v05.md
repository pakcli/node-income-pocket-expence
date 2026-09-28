# Brief v05: Master Header Row 1, Cashflow Flow KPI Row 2, Resizable Splitters Row 3, & Detailed Table Mode

> Authoritative Master Document for Release v05 Pro.  
> Detailed architecture also available at [`brief/v05_timeline-table-rail-and-splitview.md`](file:///d:/0pro/node-income-pocket-expence/brief/v05_timeline-table-rail-and-splitview.md).

---

## 1. Executive Summary & Architecture Overview

Release v05 delivers a 3-tier master workspace layout designed for high-density financial tracking:

### Row 1: Master Executive Header
- **Brand & Logo:** SP (Student Pocket v05 Pro).
- **Add Data Controls:** Quick 1-click modal triggers:
  - `+ Masuk` (Pemasukan)
  - `- Keluar` (Pengeluaran)
  - `⇄ Transfer` (Pindah Saldo Antar Kantong)
  - `+ Kantong` (Buat Rekening / Pos Baru)
- **Perspective Radio Tabs (3 Modes):**
  - `Flow`: 100% canvas (or 80% canvas + 20% inspector when opened).
  - `Split`: 50% canvas – 50% table (when inspector closed); **40% canvas – 20% inspector – 40% table** (when inspector opened).
  - `Table`: 100% full-width ledger table.
- **Canvas Flow Mode Dropdown:** `Both (Total + IRL)`, `IRL Flow Saja`, `Simple 3-Kolom`.
- **Scope Filter Dropdown:** `Semua Transaksi` vs `Kantong Terpilih Saja`.
- **Right Utilities:** Language toggle (`ID` / `EN`), Dual Export Menu (`CSV` & `SQL DB Dump`), and Multi-Saved-Account Switcher (`usr_student_1`, `usr_parent_dad`, `usr_parent_mom`).

---

### Row 2: Financial Flow KPI Bar (Mental Model Sequence)
Arranged strictly in financial cash flow order:
1. **Total Inflow (Green):** Sum of all income sources.
2. **Net Pocket Balance (Blue):**
   - Active balance across pockets.
   - Interactive dropdown button (`#btnPocketFilterToggle`) opening a floating checklist popover (`#kpiPocketFilterPopover`).
   - Users can toggle individual pockets or click "Semua" to selectively include/exclude pockets in the calculated balance and displayed panels.
3. **Total Outflow (Red):** Sum of all expenses including principal, admin, and shipping fees.

---

### Row 3: Resizable Master Workspace Panels with Drag Splitters
- **Panel Resizing:** Interactive drag splitters (`#splitterCanvas` and `#splitterInspector`) with `col-resize` cursor and glowing active indicator.
- **Safety Constraints:** Minimum panel width enforced at 18% / 160px so panels never collapse accidentally.
- **Clean Responsive Transitions:** Dragged widths automatically reset to default proportional flex rules upon switching perspective tabs (`Flow`, `Split`, `Table`).

---

### Precision Table Ledger: Simple Mode vs Detailed Mode
- **Mode Toggle Button:** `#btnToggleTableDetailMode` in table toolbar (`📑 Detailed Mode` ⮂ `📋 Simple Mode`).
- **Simple Mode (10 Columns):**
  `TIMELINE`, `Tanggal`, `Jenis`, `Perubahan` (with fee subtitle), `Saldo Berjalan`, `Dari`, `Tujuan`, `Kantong Terkait`, `Catatan`, `Aksi (Sticky Right)`.
- **Detailed Mode (13 Columns - Raw Data Table):**
  `TIMELINE`, `Tanggal`, `Jenis`, `Nominal Pokok` (change-only), `Biaya Admin`, `Ongkos Kirim`, `Total Kas` (change-all), `Saldo Berjalan`, `Dari`, `Tujuan`, `Kantong Terkait`, `Catatan`, `Aksi (Sticky Right)`.
- **Interactive Inline Quick-Add Row:** Dynamically switches between 10 columns (with fee popover) and 13 columns (with inline Admin, Ongkir, and live Total Kas calculation).
- **Chronological Sort Order Toggle:** `Latest First` (default) vs `Oldest First` with accurate snapshot running balances.
- **Zero Undefined Guarantee:** Transaction labels fallback dynamically to pocket/income/expense node lookups so `undefined` or `null` labels are eliminated.

---

### Sticky Right Action Column
Action buttons are pinned to the right edge with `position: sticky; right: 0; z-index: 2` with background fill and drop shadow:
- `✏️ Edit`: Opens `#modalEditTransaction` to modify date, amount, fees, and notes with real-time recalculation of pocket balances.
- `📋 Duplicate`: Clones the transaction with today's date and `(Salinan)` note, appending to the store and updating all balances.
- `🗑️ Delete`: Confirms and removes the transaction, restoring balances and updating keyframes.

---

## 2. Test Verification

All 4 test suites pass 100%:
- `node test_combined_run.js` (Server, static files, auth, API, exports)
- `node test_timeline.js` (Linear continuous 60fps timeline)
- `node test_inspector_features.js` (Inspector transactions, fees, attachments)
- `node test_v05_features.js` (Master Header, Cashflow KPIs, Resizable Panels, Detailed/Simple Table Mode, Sticky Actions)
