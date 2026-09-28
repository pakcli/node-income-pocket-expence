# Student Pocket Manager – Master Specification (v05)
## Complete Architectural Evolution: Vertical Integrated Timeline Rail, 40-20-40 Responsive Split View, Inline Table Quick-Add, and Compact Node Design

> **Document Status:** Authoritative Master Reference for Release v05  
> **File:** `brief/v05_timeline-table-rail-and-splitview.md` (and root `brief_v05.md`)  
> **Date:** September 2026  
> **Target Audience:** Systems Architects, Frontend & Full-Stack Engineers, UI/UX Designers, Product Owners  

---

## 1. Executive Summary & Key Innovations in v05

Release **v05** transforms the **Student Pocket Manager** from a dual-view finance tool into a deeply unified, interactive financial workspace. It directly bridges the gap between the spatial visualization of cash flow (SVG Flow Canvas) and the chronological precision of accounting (Table Ledger), allowing users to scrubs through financial keyframes while observing synchronized mutations across canvas nodes, the inspector panel, and table rows simultaneously.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  RELEASE v05 AT A GLANCE                               │
├──────────────────────────┬─────────────────────────────────────────────────────────────┤
│ 📐 Compact Node Geometry  │ 78% node width (207px max / 168px min) for higher density    │
│ ⏱️ Vertical Timeline Rail │ Integrated table rail with dots linking Latest (top) to     │
│                          │ Oldest (bottom), clickable to scrub playhead                │
│ 🖥️ 40-20-40 Split Layout │ 40% Canvas ── 20% Inspector ── 40% Table responsive layout │
│ ⚡ Inline Quick-Add Row   │ Dynamic transaction creation row directly below table thead │
│ 🎯 Node Click Dispatcher │ Dropdown mode: [Both / Table Only / Inspector Only]         │
│ 🏷️ Strict Cost Breakdown  │ Transparent Admin Fee & Shipping Fee calculation            │
│ 📎 Attachment Engine     │ Multi-file receipts & proof-of-transfer management          │
└──────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 2. Workspace View Modes & Responsive Geometry

### 2.1 The 3 Display Modes
The application supports three workspace perspectives via the header view tabs:

1. **Flow Canvas Mode (`mode-flow`):**
   - **Inspector Closed:** 100% viewport width dedicated to the visual graph.
   - **Inspector Opened:** 80% Canvas + 20% Inspector sidebar (`flex: 4` to `flex: 1`).
2. **Ledger Table Mode (`mode-table`):**
   - 100% full-width tabular view featuring the integrated vertical timeline rail.
3. **Split View Mode (`mode-split`):**
   - **Inspector Closed:** Balanced 50% Canvas – 50% Table layout.
   - **Inspector Opened (Tri-Pane 40-20-40):** 40% Canvas – 20% Inspector – 40% Table.

### 2.2 CSS Layout Implementation
```css
/* Split Mode 40-20-40 when inspector opened */
.workspace-container.mode-split .canvas-wrapper {
  flex: 2; /* 40% */
  min-width: 0;
}
.workspace-container.mode-split .inspector-sidebar {
  flex: 1; /* 20% */
  min-width: 250px;
  max-width: 340px;
}
.workspace-container.mode-split .table-view-container {
  flex: 2; /* 40% */
  min-width: 0;
}

/* Split Mode 50-50 when inspector closed */
.workspace-container.mode-split.inspector-hidden .canvas-wrapper {
  flex: 1; /* 50% */
}
.workspace-container.mode-split.inspector-hidden .inspector-sidebar {
  display: none !important;
}
.workspace-container.mode-split.inspector-hidden .table-view-container {
  flex: 1; /* 50% */
}
```

---

## 3. Vertical Integrated Timeline Rail in Table Ledger

### 3.1 Design & Wireframe
Rather than separating the timeline scrubber exclusively at the bottom of the canvas, v05 integrates a vertical rail directly into the first column of the Table Ledger. Transactions are ordered chronologically descending (**Latest on top, Oldest on bottom**).

```
   TIMELINE     TANGGAL     JENIS      PERUBAHAN       SALDO BERJALAN   DARI ➔ TUJUAN
┌────────────┬────────────┬─────────┬───────────────┬─────────────────┬────────────────┐
│   ● (Top)  │ 2026-09-05 │ EXPENSE │ -Rp 15.000    │ Rp 1.936.500    │ GoPay ➔ Bensin │
│   │        │            │         │               │                 │                │
│   ● (Mid)  │ 2026-09-03 │ TRANSFR │ ⇄ Rp 100.000  │ Rp 1.951.500    │ BCA ➔ GoPay    │
│   │        │            │         │               │                 │                │
│   ● (Btm)  │ 2026-09-01 │ INCOME  │ +Rp 2.000.000 │ Rp 2.000.000    │ Gaji ➔ BCA     │
└────────────┴────────────┴─────────┴───────────────┴─────────────────┴────────────────┘
    Latest                                                                 Oldest
```

### 3.2 Key Behaviors:
- **Continuous Rail Line:** Each cell contains `.timeline-rail-line-top` and `.timeline-rail-line-bottom`, with `.is-first` hiding the top segment on the latest item and `.is-last` hiding the bottom segment on the oldest item.
- **Interactive Dot (`.timeline-rail-dot`):** Clicking any rail dot immediately invokes `timelineController.jumpTo(frameIdx, true)`, updating the canvas playhead, flowing cash pulse, and active row glow.
- **Active State Synchronization:** Listens to `timelineFrameChanged` dispatched from the timeline engine. Active frame receives `.active` on the dot and `.row-active-frame` with an animated golden border glow on the table row.

---

## 4. Interactive Inline Quick-Add Row

Located directly below the `<thead>` of the table, this row enables high-speed keyboard-friendly data entry without navigating to modals or side panels.

### 4.1 Row Layout:
```
[⚡] [Date Input] [Type Select] [Amount + Fee Popover 🏷️] [Auto-Calc] [Source Dropdown] [Target Dropdown] [Pocket Badge] [Note Input] [+ Catat]
```

### 4.2 Dynamic Type Configuration:
1. **Expense:**
   - Source: Pockets & Bank Accounts (with live balances)
   - Target: Expense Categories
   - Pocket Attribution: Automatically maps to the chosen source pocket.
2. **Income:**
   - Source: Income Sources (Allowance, Salary, Freelance)
   - Target: Destination Pocket / Account
   - Pocket Attribution: Automatically maps to the chosen target pocket.
3. **Transfer:**
   - Source: Origin Pocket
   - Target: Destination Pocket
   - Pocket Attribution: Displays `⇄ Antar Kantong`.

### 4.3 Fee Breakdown Popover:
Clicking the `🏷️` icon toggles an overlay permitting specification of:
- **Biaya Admin (Rp):** Handled as an additional deduction on transfers or expenses.
- **Ongkos Kirim (Rp):** Separately itemized for expense purchases (e.g. food delivery, online shopping).
- Total balance deduction formula:
  $$\text{Total Deducted} = \text{Nominal Pokok} + \text{Biaya Admin} + \text{Ongkos Kirim}$$

---

## 5. Node-Click Interaction Dispatcher

To provide optimal ergonomics across single-screen and multi-pane setups, the table toolbar features the **"Saat Node Diklik"** dropdown selector with 3 configurable behaviors:

| Mode | Value | Behavior on Node Click | Recommended Use Case |
|---|---|---|---|
| **🔍 Keduanya (Default)** | `both` | Opens/focuses the Inspector Sidebar AND smooth-scrolls & highlights corresponding rows in Table Ledger. | Split View (40-20-40) |
| **📋 Sorot Baris Saja** | `table` | Suppresses inspector opening. Highlights matching transactions in the ledger and scrolls first match into center view. | Full-table data entry & audit |
| **📌 Buka Inspector Saja** | `inspector` | Focuses purely on node ledger cards, balance editors, and receipt attachments without moving table scroll. | Detailed node balance adjustments |

---

## 6. Thinner Compact Node Cards (78% Width)

To maximize data visibility and prevent canvas overcrowding, node widths have been re-calibrated:
- **Original Width:** `265px`
- **v05 Width:** `Math.round(265 * 0.78) = 207px` (Minimum width: `168px`)
- **Canvas Centering:** The center pocket column calculates symmetrical gutters `(viewportWidth - nodeWidth) / 2` to maintain balance regardless of window resizing.
- **Header & Pill Density:** Node title font sized to `11.5px`, category badges to `8.5px`, and balance readouts to `12.5px bold JetBrains Mono`.

---

## 7. Automated Test Suite & Verification Results

The v05 test suite covers 4 automated test harnesses:

| Test Harness | Target | Status |
|---|---|---|
| `node test_combined_run.js` | Server health, auth, static delivery, dual export engine | ✅ PASS (100%) |
| `node test_timeline.js` | Linear 60fps scrubber, step mode, duration mode, pin jumps | ✅ PASS (100%) |
| `node test_inspector_features.js` | Inspector add-tx, admin fees, shipping fees, attachments | ✅ PASS (100%) |
| `node test_v05_features.js` | Vertical timeline rail sort, inline quick-add, split modes | ✅ PASS (100%) |

---

## 8. Summary of Modified Codebase Files

- `frontend/index.html`: Added `#btnCloseInspector`, `#nodeClickActionSelect`, table `#tableQuickAddRow` with fees popover, and `TIMELINE` rail column.
- `frontend/css/styles.css`: Added responsive classes (`.mode-flow`, `.mode-table`, `.mode-split`, `.inspector-hidden`), vertical rail styling (`.timeline-rail-wrapper`, `.timeline-rail-dot`, `.timeline-rail-line-*`), quick-add inputs, and golden pulse animations.
- `frontend/js/flow.js`: Implemented 78% compact node geometry and centered column distribution.
- `frontend/js/timeline.js`: Added `timelineFrameChanged` dispatching on each frame update.
- `frontend/js/app.js`: Added `updateViewLayout()`, inspector toggle listener, dynamic `#tableQuickAddRow` dropdown generator, quick-add submitter with fee calculations, and timeline dot click jumper.
- `test_v05_features.js`: Automated integration test verifying v05 specifications.
