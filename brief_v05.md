# Brief v05: Master Workspace, Visual Flow & Precision Table (Vanilla JS Master & React Migration Roadmap)

> Authoritative Master Specification for Release v05.  
> Architecture: Vanilla JS Local-First Engine with LocalStorage Persistence, Node.js + Express Backend, and upcoming React Framework Migration.

---

## 1. Executive Summary & Layout Architecture

Release v05 delivers a 3-tier master workspace layout designed for high-density financial tracking with interactive visual flows and a precision accounting table ledger:

```
+-----------------------------------------------------------------------------------------------------------------------------+
| ROW 1: MASTER EXECUTIVE HEADER                                                                                              |
| [SP] Logo | [+ Masuk] [- Keluar] [⇄ Transfer] [+ Kantong] | [Flow|Split|Table] | [Both▼] [Scope▼] | [ID] [Export▼] [User▼]  |
+-----------------------------------------------------------------------------------------------------------------------------+
| ROW 2: FINANCIAL FLOW KPI BAR                                                                                               |
| 🟢 Total Pemasukan (+Rp X)  |  🔵 Net Pocket Balance (Rp Y [3/4 Kantong▼])  |  🔴 Total Pengeluaran (-Rp Z)                  |
+-----------------------------------------------------------------------------------------------------------------------------+
| ROW 3: THREE-PANEL RESIZABLE WORKSPACE                                                                                      |
| +--------------------------------+ | +------------------------+ | +-------------------------------------------------------+ |
| | FLOW CANVAS                    | | | NODE INSPECTOR         | | | TABLE LEDGER                                          | |
| | - Simple / IRL / Both modes    |S| | - Statistics           |S| | - Simple (10 cols) / Detailed (13 cols)               | |
| | - 60fps Cashflow particles     |P| | - Quick mutasi         |P| | - Latest first (default) / Oldest first toggle        | |
| | - Inactive pocket grayout/dim  |L| | - Staged attachments   |L| | - Inline quick-add row with auto-calc                 | |
| | - Smooth Bezier / Arc edges    | | | - Modal edit triggers  | | | - Sticky right actions (Edit, Clone, Delete)          | |
| +--------------------------------+ | +------------------------+ | +-------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Detailed Component Specifications

### 2.1. Row 1: Master Executive Header
- **Brand & Logo:** `SP` (Student Pocket v05 Pro).
- **Add Data Controls (Quick Modal Triggers):**
  - `+ Masuk` (Pemasukan): Opens `#modalAddIncome` to log income from external sources to any pocket.
  - `- Keluar` (Pengeluaran): Opens `#modalAddExpense` to record expenses with optional admin & shipping fees.
  - `⇄ Transfer`: Opens `#modalTransfer` for fund reallocations between pockets.
  - `+ Kantong`: Opens `#modalAddPocket` to create new cash, bank, or e-wallet pockets.
- **Perspective Radio Tabs (3 Modes):**
  - `Flow Mode`: 100% full visual network canvas (or 80% canvas + 20% inspector when inspector is opened).
  - `Split Mode`: 50% canvas – 50% table (when inspector is closed); **40% canvas – 20% inspector – 40% table** (when inspector is opened).
  - `Table Mode`: 100% full-width accounting ledger table.
- **Canvas Flow Mode Dropdown:**
  - `Both (Total + IRL)`: Displays macro summary column nodes alongside individual account nodes.
  - `IRL Flow Saja`: Focuses strictly on realistic accounts (Dompet, Bank, GoPay) and their actual flows.
  - `Simple 3-Kolom`: Strict 3-column macro structure (Income Sources ➔ Pockets ➔ Expense Categories).
- **Scope Filter Dropdown:**
  - `Semua Transaksi`: Evaluates all transactions across all pockets.
  - `Kantong Terpilih Saja`: Dynamically filters the ledger and calculations to only transactions connected to active pockets.
- **Header Right Utilities:**
  - Language toggle (`ID` / `EN` with full JSON translations).
  - Dual Export Menu: Instant browser downloads for `CSV` and `SQL SQLite Dump`.
  - Multi-Saved-Account Switcher: 1-click instantaneous switching between Student (`Budi Pratama`), Dad (`Hendra Pratama`), and Mom (`Dewi Pratama`).

---

### 2.2. Row 2: Financial Flow KPI Bar (Mental Model Sequence)
Arranged strictly in sequence of real-world money movement:
1. **Total Inflow (Green):** Sum of all incoming money from all income sources (`+Rp X`).
2. **Net Pocket Balance (Blue):**
   - Live aggregated balance of currently active pockets.
   - Interactive dropdown button (`#btnPocketFilterToggle`) opening a floating checklist popover (`#kpiPocketFilterPopover`).
   - Popover features a "Semua" quick-toggle button and individual checkboxes with real-time balance per pocket.
   - Minimum 1 pocket selection enforced to prevent zero-state lockup.
3. **Total Outflow (Red):** Sum of all expenses, including principal amounts, admin fees, and shipping fees (`-Rp Z`).

---

### 2.3. Row 3: Visual State of Active vs Inactive / Disabled Pockets
When a pocket is unchecked/disabled via the KPI checklist popover:
- **Spatial Consistency:** The pocket node remains in place on the canvas (preserving layout memory), but is rendered in a dimmed, desaturated state:
  - CSS: `.node-dimmed-disabled` (`opacity: 0.22`, `filter: grayscale(85%) contrast(0.8)`).
  - Hover Reveal: Hovering over the dimmed node raises opacity to `0.65` for inspection.
- **Flow Line Dimming:** All edges connected to the disabled pocket receive `.edge-dimmed-disabled` (`opacity: 0.1 !important`, `filter: grayscale(100%)`).
- **Particle & Flow Animation Suppression:** All animated dashes and flying cash flow capsules (`drawCashFlowCapsule`) on connected edges are immediately halted.
- **Instant Reactivation:** Re-checking the pocket smoothly transitions opacity back to `1.0` and immediately restarts cash flow animations.

---

### 2.4. Resizable Master Workspace Panels with Drag Splitters
- **Splitters:** Dedicated drag handles (`#splitterCanvas` and `#splitterInspector`) positioned between panels.
- **Visual Feedback:** Grip pill (`::after`), hover glow (`#38bdf8`), and `col-resize` cursor during drag.
- **Performance:** Attaches `.workspace-container.is-resizing` to disable CSS transitions during live mouse dragging for smooth 60fps tracking without feedback jitter.
- **Boundary Clamping:** Left minimum width 240px, right minimum width 200px.
- **Double-Click Reset:** Double-clicking any splitter resets panel sizes back to default proportional flex settings.

---

### 2.5. Precision Table Ledger: Simple Mode vs Detailed Mode
- **Mode Toggle Button:** `#btnToggleTableDetailMode` (`📑 Detailed Mode` ⮂ `📋 Simple Mode`).
- **Simple Mode (10 Columns):**
  1. `TIMELINE` (Vertical continuous rail dot indicator)
  2. `Tanggal` (Sortable)
  3. `Jenis` (INCOME, EXPENSE, TRANSFER badge)
  4. `Perubahan` (Total cash change with fee subtitle)
  5. `Saldo Berjalan` (Running balance accurate per historical transaction)
  6. `Dari (Sumber)`
  7. `Tujuan`
  8. `Kantong Terkait`
  9. `Catatan`
  10. `Aksi (Sticky Right)` (Edit, Clone, Delete)
- **Detailed Mode (13 Columns - Raw Data Table):**
  1. `TIMELINE`
  2. `Tanggal` (Sortable)
  3. `Jenis`
  4. `Nominal Pokok` (Change only)
  5. `Biaya Admin` (Highlighted in amber if > 0)
  6. `Ongkos Kirim` (Highlighted in amber if > 0)
  7. `Total Kas` (Change all: Pokok + Admin + Ongkir)
  8. `Saldo Berjalan`
  9. `Dari (Sumber)`
  10. `Tujuan`
  11. `Kantong Terkait`
  12. `Catatan`
  13. `Aksi (Sticky Right)`
- **Interactive Inline Quick-Add Row (`#tableQuickAddRow`):**
  - In Simple Mode: Includes a fee toggle button (`🏷️`) opening a floating popover to input Admin & Ongkir.
  - In Detailed Mode: Exposes dedicated inline inputs for Admin & Ongkir with auto-calculated `Total Kas`.
- **Chronological Sort Order Toggle:**
  - Header button `#btnToggleSortOrder` toggles between `Terbaru Dulu` (Latest first - default) and `Terlama Dulu` (Oldest first).
  - Also triggerable by clicking the `Tanggal` table column header (`#thSortDate`).
- **Sticky Right Action Column:**
  - Pinned to right edge (`position: sticky; right: 0; z-index: 2`).
  - `✏️ Edit`: Opens modal with pre-filled transaction data.
  - `📋 Duplicate`: Clones transaction for today with `(Salinan)` tag.
  - `🗑️ Delete`: Confirms and deletes transaction, recalculating pocket balances immediately.

---

### 2.6. Full Webapp Settings Persistence (`localStorage`)
All preferences and view states are automatically persisted under the key:
`student_pocket_settings_v05`

Saved fields:
1. `currentView`: `'flow'` | `'split'` | `'table'`
2. `isInspectorOpen`: `true` | `false`
3. `canvasMode`: `'both'` | `'irl'` | `'simple'`
4. `scopeFilter`: `'all'` | `'filtered'`
5. `tableSortOrder`: `'latest'` | `'oldest'`
6. `isTableDetailedMode`: `true` | `false`
7. `activePocketFilterIds`: Array of selected pocket IDs
8. `tableFilter`: `'all'` | `'income'` | `'expense'` | `'transfer'`
9. `nodeClickAction`: `'both'` | `'table'` | `'inspector'`
10. `panelWidths`: `{ canvas: string, inspector: string, table: string }`

On initial application load, the state is hydrated before first render, guaranteeing seamless session continuity across browser reloads.

---

## 3. Automated Test Verification Results

All automated test suites pass 100%:
1. `node test_combined_run.js`:
   - Static file delivery (`index.html`, `styles.css`, `app.js`).
   - API health check (`/api/health`).
   - Multi-saved-account switcher API (`/api/auth/saved-accounts`, `/api/auth/switch-account`).
   - Authenticated nodes & transactions API.
   - Dual export engine (`/api/export/csv`, `/api/export/db`).
2. `node test_v05_features.js` (10 Verification Checkpoints):
   - Checkpoint 1: Chronological descending sort (Latest on top, Oldest on bottom).
   - Checkpoint 2: Quick-Add transaction execution with admin & shipping fees.
   - Checkpoint 3: Zero undefined or null strings in transaction labels.
   - Checkpoint 4: Table sort order toggle (Latest first vs Oldest first).
   - Checkpoint 5: Detailed mode 13-column cash flow breakdown calculations.
   - Checkpoint 6: Transaction duplication for today (Sticky actions).
   - Checkpoint 7: Transaction update and pocket recalculation (Sticky actions).
   - Checkpoint 8: Net Pocket Balance with pocket checklist filter.
   - Checkpoint 9: `FlowCanvas.setActivePockets` and `isPocketActive` dimmed state logic.
   - Checkpoint 10: LocalStorage settings persistence round-trip.

---

## 4. Phase 2: React Framework Migration Roadmap

The frontend will be migrated to **React + Vite** while preserving 100% of the tested business logic and visual ergonomics:

### Migration Architecture:
1. **Tooling:** Vite + React + TypeScript/ESNext.
2. **State Management:** A lightweight reactive store (using Zustand or React Context + `useSyncExternalStore`) porting `store.js` and `accounts.js`.
3. **Component Hierarchy:**
   - `<App />` (Hydrates settings from `localStorage`, handles keyboard shortcuts)
     - `<MasterHeader />` (Logo, Quick Add modal buttons, Perspective radio buttons, Scope/Mode selects, Lang/Export/Account menus)
     - `<KpiBar />` (Inflow, Outflow, Net Pocket Balance with `<PocketChecklistPopover />`)
     - `<WorkspaceLayout />` (Splitter container handling live drag resizing)
       - `<FlowCanvasView />` (Interactive SVG/Canvas node-link network with 60fps particle ticker)
       - `<NodeInspector />` (Selected node statistics, staged attachments, quick mutasi form)
       - `<TableLedger />` (Simple 10-col / Detailed 13-col mode, quick-add row, sticky right action column)
     - `<ModalsContainer />` (Add Income, Add Expense, Transfer, Add Pocket, Edit Transaction)
4. **Preservation of CSS Styling:** The polished Blender dark theme styles from `frontend/css/styles.css` will be ported directly as modular or global styles.
