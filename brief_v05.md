# Brief v05: Integrated Vertical Timeline Rail, 40-20-40 Split View, & Inline Table Quick-Add

> Authoritative Master Document for Release v05.  
> Detailed architecture also available at [`brief/v05_timeline-table-rail-and-splitview.md`](file:///d:/0pro/node-income-pocket-expence/brief/v05_timeline-table-rail-and-splitview.md).

---

## 1. Executive Summary

Release v05 delivers:
1. **Vertical Integrated Timeline Rail:** In the Table Ledger, a connected vertical line with interactive dots (`●`) runs down the left rail from **Latest (top)** to **Oldest (bottom)**. Clicking any dot scrubs the timeline playhead directly to that keyframe.
2. **Interactive Inline Quick-Add Row:** Located directly below the table `<thead>`, offering high-speed inline entry for date, type, principal amount, popover for Admin & Shipping fees, dynamic source/target selectors, notes, and a one-click "+ Catat" button (or Enter key).
3. **Responsive View Modes (40-20-40 Split):**
   - **Flow Canvas Mode:** 100% canvas (or 80% canvas + 20% inspector when opened).
   - **Ledger Mode:** 100% full-width table with timeline rail.
   - **Split View Mode:** 50% canvas – 50% table (when inspector closed); **40% canvas – 20% inspector – 40% table** (when inspector opened).
4. **Node Click Interaction Dropdown:** In the table toolbar, users can choose:
   - `both` (Default): Opens Inspector + Scrolls and highlights matching rows in the Table.
   - `table`: Suppresses inspector; only scrolls & highlights matching rows in the Table.
   - `inspector`: Only opens the Inspector without altering table scroll.
5. **Thinner Compact Nodes (78% Width):** Nodes are re-proportioned to 78% of original width (`207px` max, `168px` min) with symmetrical centered canvas alignment.
6. **Strict Fee & Attachment Model:** Explicit separation of Admin Fees and Shipping Fees, plus dual-receipt image/PDF attachments per node and transaction.

---

## 2. Test Verification

All 4 test suites pass 100%:
- `node test_combined_run.js` (Server, static files, auth, API, exports)
- `node test_timeline.js` (Linear continuous 60fps timeline)
- `node test_inspector_features.js` (Inspector transactions, fees, attachments)
- `node test_v05_features.js` (Vertical timeline rail, quick-add, split modes)
