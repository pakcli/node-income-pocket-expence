# Technical Specification: Export Options Matrix & SQLite 3 Binary Engine (Brief v08)

**Application Name:** Student Pocket Manager  
**Version:** 0.6.2 (Export Options Matrix & Native SQLite 3 DB Engine)  
**Date:** September 2026  
**Status:** Implemented & Verified (100% Automated Test Pass Rate)

---

## 1. Feature Overview

The user requested a dedicated **Export Data Options Table Matrix** allowing flexible combinations of export file formats and data scopes, specifically:

- **Format Options:** `CSV` (`.csv`), `SQLite Database` (`.db`), `SQL Dump` (`.sql`)
- **Scope Options:** `Current View` (bounded by active timeline range, presets, balance filters, and selected pocket checklist) vs `All Data` (complete database)
- **100% DB Browser for SQLite Compatibility:** When exporting as `.db`, the system MUST output a genuine binary SQLite 3 file starting with the official `SQLite format 3\0` magic byte header, preventing DB Browser for SQLite from opening an empty in-memory fallback.

---

## 2. Export Options Matrix Table

The modal `<ModalExportData />` displays an intuitive 2D grid matrix:

| File Format | 🎯 Current View (Filtered Scope) | 🌐 All Data (Full Database) | Description & Compatibility |
|---|---|---|---|
| **📊 Spreadsheet (`.csv`)** | `[⬇️ Unduh CSV (View)]` | `[⬇️ Unduh CSV (Semua)]` | UTF-8 formatted CSV with full headers (Nominal Pokok, Admin, Ongkir, Total Kas). Perfect for Excel & Google Sheets. |
| **🗄️ SQLite Database (`.db`)** | `[⬇️ Unduh .db (View)]` | `[⬇️ Unduh .db (Semua)]` | Genuine binary SQLite 3 database (`application/vnd.sqlite3`). Direct compatibility with **DB Browser for SQLite**. Contains `nodes` & `transactions` tables. |
| **📜 SQL Script (`.sql`)** | `[⬇️ Unduh .sql (View)]` | `[⬇️ Unduh .sql (Semua)]` | Raw DDL & DML script containing `CREATE TABLE` and batch `INSERT INTO` statements. |

---

## 3. SQLite Binary Generation Architecture

### 3.1 Root Cause of Previous "In-Memory" Fallback
Previously, `/api/export/db` streamed raw SQL text under a `.db` filename. When opened in **DB Browser for SQLite**, DB Browser inspected the magic byte header, failed to detect the standard binary header `SQLite format 3\0`, and fell back to creating a blank in-memory database:
> `"DB Browser for SQLite - In-Memory database"`

### 3.2 Solution Implementation (`backend/src/routes/export.js`)
1. An isolated temporary SQLite 3 file is instantiated on disk via `better-sqlite3`:
   ```javascript
   const tempDbPath = path.join(os.tmpdir(), `export_${userId}_${Date.now()}.db`);
   const exportDb = new Database(tempDbPath);
   ```
2. Proper schema tables (`nodes`, `transactions`) are created with primary keys, foreign keys, and indexes.
3. Transactions and nodes matching the requested scope (`scope === 'view'` vs `scope === 'all'`) are inserted via parameterized prepared statements inside a transaction:
   ```javascript
   const insertTx = exportDb.prepare(`
     INSERT INTO transactions (id, user_id, type, from_node_id, to_node_id, amount, currency, date, note, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `);
   ```
4. The database is closed (`exportDb.close()`), ensuring WAL checkpoints and table structures are finalized to disk.
5. The binary buffer is read (`fs.readFileSync(tempDbPath)`) and streamed to the client with:
   - Header: `Content-Type: application/vnd.sqlite3`
   - Header: `Content-Disposition: attachment; filename="student_pocket_data_...db"`
6. The temporary file is safely unlinked (`fs.unlinkSync(tempDbPath)`).

---

## 4. Frontend Component Design (`ModalExportData.jsx`)

1. **Trigger:** Click the `📥 Export` button in the `MasterHeader` to open the modal.
2. **Current View Scoping Context:**
   - Active date range: `dateRange.start` to `dateRange.end`
   - Active preset: `presetView` (All Time, Today, 3 Days, This Week, Month, Balance, Income)
   - Minimum balance: `customMinBalance`
   - Active income sources: `selectedIncomeIds`
   - Active pocket filter: `activePocketFilterIds`
3. **Download Mechanism:**
   - For `Current View`, sends a `POST` request with the filtered transaction list and active nodes in the JSON body.
   - For `All Data`, sends a `GET` request with `scope=all`.
   - Uses `URL.createObjectURL(blob)` and an anchor tag `download` attribute to trigger native browser download without opening blank tabs.

---

## 5. Verification & Test Results

All test suites pass with 100% compliance:

```
[PASS] GET /api/export/csv (All Data) -> HTTP 200 (Content-Type: text/csv; charset=utf-8)
[PASS] POST /api/export/csv (Current View Scope) -> HTTP 200
[PASS] GET /api/export/db (All Data) -> HTTP 200 (Content-Type: application/vnd.sqlite3)
       [CONFIRMED] Exported .db has genuine "SQLite format 3" magic header for DB Browser for SQLite!
[PASS] POST /api/export/db (Current View Scope) -> HTTP 200
       [VERIFIED] Opened exported .db in SQLite engine successfully! Tables: {"nodes":9,"transactions":5}
[PASS] GET /api/export/sql (All Data) -> HTTP 200 (Content-Type: application/sql; charset=utf-8)
[PASS] POST /api/export/sql (Current View Scope) -> HTTP 200

🎉 ALL COMBINED LOCALHOST INTEGRATION TESTS PASSED 100%!
```
