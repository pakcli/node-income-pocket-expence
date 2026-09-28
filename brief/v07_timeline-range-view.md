# System Architecture & Feature Specification: Student Pocket Manager (Brief v06)

**Application Name:** Student Pocket Manager (Visual Flow & Precision Ledger)  
**Version:** 0.6.0 (React 19 + Vite 8 Architecture & Blender Theme)  
**Primary Engine:** Node.js (Express 5 Backend) + React 19 Frontend  
**Production Delivery:** Compiled React application directly deployed at root `/` (`frontend/`) and `/react/`  
**Date:** September 2026

---

## 1. Executive Summary & Progression

Student Pocket Manager transitions from the legacy vanilla HTML/JS implementation into a unified **React 19 + Vite 8 Component Architecture**. The production build overwrites the main `frontend/` folder, ensuring seamless backwards compatibility with the Express server while dramatically improving maintainability, reactive state synchronization, and component modularity.

### Version Evolution
- **v01 - v03:** Vanilla SVG flow canvas, basic SQLite storage, dual-entry ledger.
- **v04:** Blender-style node graph (sockets, bezier curves, drag-sort reordering, ghost drop preview, bottom transport scrubber).
- **v05:** Tri-perspective view modes (`flow`, `split`, `table`), 3-column resizable panel splitters with drag handles, 13-column detailed ledger with running balances and inline quick-add, multi-account profile switcher.
- **v06 (Current):**
  1. Full **React 19 Framework Migration** compiled directly into the primary `frontend/` folder.
  2. **Authentic Blender Theme System** (Dark & Light matte themes, flat solid fills, crisp borders, zero unnecessary gradients).
  3. **Thicker Quick-Add Buttons** conforming strictly to **1 Symbol + 1 Word** (`+ Pemasukan`, `− Pengeluaran`, `⇄ Transfer`, `💳 Kantong`).
  4. **Timeline View Range Handles** (`timestartdatetime` & `timeenddatetime`) docked below the timeline.
  5. **Preset View Filtering**:
     - *Relative Ranges:* `Semua Waktu (All Time)`, `Hari Ini (Today)`, `3 Hari Terakhir`, `Minggu Ini`, `Bulan Ini`.
     - *Berdasarkan Saldo Tertentu:* Inline numeric threshold input (`Min Rp:`).
     - *Berdasarkan Pemasukan Tertentu:* Multi-select checklist popover with `Pilih Semua`, `Hapus Semua`, and individual source checkboxes.
  6. **Scoped Dynamic Data Export:** Export CSV filtered strictly according to the active view range, scope, balance, and income selection.
  7. **Interactive Row-Click Cash Flow Animation:** Clicking any transaction in the ledger highlights the row with Blender orange (`.row-active-frame`), lights up the vertical timeline rail dot (`.timeline-rail-dot.active`), seeks the timeline frame, and animates the golden cash capsule flying along the bezier/arc curve connecting the source node output socket to the target node input socket.

---

## 2. Authentic Blender Theme System

Following Blender's professional UI guidelines, all shiny pseudo-3D gradients, gloss overlays, and neon distractions have been eliminated in favor of clean, matte, flat surfaces with high contrast and crisp 1px borders.

### 2.1 Dark Theme (`body.theme-blender-dark`)
| Token | Value | Description |
|---|---|---|
| `--bg-primary` | `#191c20` | Main canvas and window backdrop |
| `--bg-secondary` | `#22262b` | Header, sidebars, and docking areas |
| `--bg-surface` | `#2b3036` | Node cards, panels, and table containers |
| `--bg-surface-elevated` | `#363c44` | Popovers, dropdown menus, and modals |
| `--border-color` | `rgba(255, 255, 255, 0.1)` | Subtle, crisp structural dividers |
| `--border-focus` | `#ea7600` | Classic Blender Orange focus outline |
| `--accent-blender` | `#ea7600` | Primary active accent and keyframe color |
| `--text-primary` | `#f0f4f8` | High-contrast body typography |
| `--text-secondary` | `#9aa2ac` | Secondary captions and metadata |

### 2.2 Light Theme (`body.theme-blender-light`)
| Token | Value | Description |
|---|---|---|
| `--bg-primary` | `#dce1e7` | Light slate canvas backdrop |
| `--bg-secondary` | `#e6ebf0` | Matte light header and toolbar bar |
| `--bg-surface` | `#edf1f6` | Table rows, inspector container |
| `--bg-surface-elevated` | `#ffffff` | Elevated cards, menus, and modals |
| `--border-color` | `rgba(0, 0, 0, 0.12)` | Clean 1px gray borders |
| `--text-primary` | `#191c20` | Crisp charcoal typography |
| `--text-secondary` | `#4b535e` | Medium-contrast slate labels |

Theme selection is persisted in `localStorage` under `student_pocket_settings_v05` and toggled via the `🌙 Dark` / `☀️ Light` button located immediately beside the Export menu.

---

## 3. Quick-Add Action Buttons Specification

Buttons in the Master Header have been updated to a thicker pill format with flat, solid matte backgrounds and **exactly 1 symbol and 1 word**:

| Button | Symbol | Word | Visual Styling | Function |
|---|---|---|---|---|
| **Pemasukan** | `+` | `Pemasukan` | Flat Forest Green (`#14532d`), 1px `#22c55e` border | Opens Modal Add Income |
| **Pengeluaran** | `−` | `Pengeluaran` | Flat Crimson Red (`#7f1d1d`), 1px `#ef4444` border | Opens Modal Add Expense |
| **Transfer** | `⇄` | `Transfer` | Flat Royal Purple (`#4c1d95`), 1px `#a855f7` border | Opens Modal Transfer |
| **Kantong** | `💳` | `Kantong` | Flat Deep Blue (`#1e3a8a`), 1px `#3b82f6` border | Opens Modal Add Pocket |

All buttons feature `padding: 7px 15px`, `font-size: 12px`, `font-weight: 700`, and subtle hover lift without excessive drop shadows.

---

## 4. Timeline View Range Controls & Presets

Located directly underneath `#timelinePanel` in `FlowCanvasView.jsx`, the `<TimelineRangeControls />` component provides complete temporal and categorical scoping.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Preset View: [ 3 Hari Terakhir ▾ ]  Rentang Waktu: [ 2026-09-25 ] ➔ [ 2026-09-28 ] [↺ Reset]  [📥 Export View Ini (.csv)] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Preset Modes
1. **Semua Waktu (All Time):** Automatically bounds range between earliest and latest transaction date.
2. **Hari Ini (Today):** Sets start and end to the current date.
3. **3 Hari Terakhir:** Sets start to $(today - 3\text{ days})$ and end to today.
4. **Minggu Ini:** Sets start to Monday of the current week.
5. **Bulan Ini:** Sets start to the 1st of the current month.
6. **Berdasarkan Saldo Tertentu:** Reveals an inline numeric input `Min Rp:` (defaulting to 0) to filter transactions whose nominal amount meets or exceeds the threshold.
7. **Berdasarkan Pemasukan Tertentu:** Reveals a multi-select popover featuring:
   - `Pilih Semua` (checks all income sources)
   - `Hapus Semua` (clears all)
   - Individual checkboxes for each income stream (e.g., Gaji, Uang Saku, Freelance).

### 4.2 Two-Way Synchronization
Changes made in `TimelineRangeControls` synchronize bidirectionally across:
- **Flow Canvas:** Scopes active nodes and animated connections.
- **Table Ledger:** Filters table rows instantly, including running balances recalculation.
- **Data Export:** Restricts export data strictly to the active subset.

---

## 5. Scoped Dynamic Data Export

Clicking `📥 Export View Ini (.csv)` in the view range toolbar compiles a CSV file on-the-fly containing all currently visible transactions filtered by:
- `dateRange.start` $\le \text{date} \le$ `dateRange.end`
- `scopeFilter` (All vs Selected Pockets)
- `customMinBalance` (when in balance preset)
- `selectedIncomeIds` (when in income preset)

The downloaded file is named `student_pocket_view_export_YYYY-MM-DD.csv` and contains full headers including Admin Fee, Shipping Fee, and Total Cash Outflow.

---

## 6. Interactive Row-Click Cash Flow Animation

Clicking any row in the `TableLedger`:
1. Highlights the table row with the Blender Orange glow (`.row-active-frame`).
2. Activates the vertical timeline rail node (`.timeline-rail-dot.active`).
3. Executes `window.timelineController.jumpToTx(tx.id, true)`:
   - Seeks the scrubber and progress fill to the corresponding keyframe diamond.
   - Updates the bottom transport frame counter (`FRAME X / N`) and active transaction summary pill.
4. Calls `flowCanvas.playCashAnimationForTx(tx)`:
   - Highlights the source node and target node with golden glowing borders (`.node-timeline-active`).
   - Illuminates the connecting bezier wire (`.edge-timeline-active`).
   - Runs a 1.8-second smooth `requestAnimationFrame` loop that translates the golden-bordered cash value capsule along the SVG path coordinate trajectory from the output socket to the input socket.

---

## 7. Testing & Verification Summary

All automated test suites execute with 100% pass rates:

| Test Suite | Purpose | Status |
|---|---|---|
| `npm --prefix frontend-react run build` | Vite 8 production build into `frontend/` | **PASS (339ms)** |
| `node test_combined_run.js` | Express API + React frontend delivery at root `/` | **PASS (7/7 tests)** |
| `node test_v05_features.js` | Balance math, pocket checklist filter, persistence | **PASS (10/10 tests)** |
| `node test_v06_features.js` | Presets, 1-symbol buttons, range export, row cashflow animation | **PASS (5/5 tests)** |

---

## 8. Directory Structure (Current)

```
node-income-pocket-expence/
├── backend/
│   ├── src/
│   │   ├── server.js               # Express 5 server (delivers frontend/ at root /)
│   │   ├── routes/                 # auth, nodes, transactions, export
│   │   └── services/               # sqlite, export engines
├── frontend/                       # Compiled production build of React app
│   ├── index.html                  # React entry point
│   └── assets/                     # Vite optimized JS & CSS bundles
├── frontend-react/                 # Source React 19 + Vite 8 project
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header/MasterHeader.jsx          # Quick-Add & Theme Toggle
│   │   │   ├── Flow/FlowCanvasView.jsx          # SVG Canvas & Timeline
│   │   │   ├── Flow/TimelineRangeControls.jsx   # View Range & Presets Toolbar
│   │   │   ├── Kpis/KpiBar.jsx                  # Financial KPIs & Pocket Filter
│   │   │   ├── Table/TableLedger.jsx            # Precision Ledger Table
│   │   │   ├── Inspector/NodeInspector.jsx      # Node Detail Inspector
│   │   │   └── Modals/                          # Add Income, Expense, Pocket, Account
│   │   ├── hooks/                  # useStore, useSettings, useAccounts, useI18n
│   │   ├── services/               # flow.js, timeline.js, store.js, i18n.js
│   │   ├── App.jsx                 # Master application controller
│   │   └── styles.css              # Blender Dark & Light Master Styles
│   ├── index.html
│   ├── vite.config.js              # Configured with outDir: '../frontend'
│   └── package.json
├── test_combined_run.js            # Integration test suite
├── test_v05_features.js            # v05 logic test suite
├── test_v06_features.js            # v06 feature test suite
└── BRIEF_v06.md                    # This document
```
