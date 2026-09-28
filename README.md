# Student Pocket Manager

> Visual flow-based personal finance tracker tailored for students and their families, featuring dual visualization engines (Simple Mode & IRL Mode), precision accountability table ledger, multi-saved-account switcher, multi-language (i18n), and dual data export.  
> Conforms strictly to **Brief v04 Specification** (`brief/v04_main-idea-cpanel-comparing-sistem.md`).

---

## 🌟 Fitur Utama (Brief v04)

1. **Dual Visualization Engines:**
   - **Simple Mode:** Alur 3-kolom linier (`Pemasukan` → `Kantong/Rekening` → `Pengeluaran`).
   - **IRL Mode:** Jaringan realistis dengan visualisasi transfer saldo antar dompet/bank/e-wallet dengan garis lengkung putus-putus (*curved bezier/arc*).
2. **Precision Accountability (Table View / Buku Kas):**
   - Audit trail dengan kolom: `Tanggal`, `Jenis`, `Perubahan`, `Saldo Berjalan`, `Dari`, `Tujuan`, `Kantong Terkait`, `Catatan`, dan `Aksi`.
   - Real-time search & type filtering.
3. **Multi-Saved-Account Switcher (1-Click Switch):**
   - Pergantian profil instan 1-klik (gaya Instagram/Google) antara Siswa (*Student*), Ayah (*Parent*), dan Ibu (*Parent*) tanpa perlu logout atau login ulang.
4. **Multi-Language (i18n):**
   - Dukungan dwibahasa penuh Bahasa Indonesia (`id`) & English (`en`), dengan format mata uang otomatis (`Rp` & `$`).
5. **Dual Data Export Freedom:**
   - Ekspor spreadsheet: `student-pocket-export.csv`
   - Ekspor database SQLite: `student-pocket-data.sql` / `.db`
6. **Backend Node.js + SQLite:**
   - Cepat, ringan (< 15 MB RAM untuk SQLite WAL mode), ACID compliant dengan *row-level security*.

---

## ⚡ Panduan Memulai Cepat (Quick Start)

### 1. Instalasi Dependensi
```bash
npm install
cd backend && npm install && cd ..
```

### 2. Menjalankan Aplikasi
```bash
# Menjalankan server gabungan (Backend API + Frontend Web)
npm start
```
Buka browser di: **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Panduan Pengujian Setiap Step
Untuk instruksi pengujian lengkap dari **Step 1 sampai Step 4**, silakan baca dokumen:
👉 **[CHECKLIST_STEPS.md](CHECKLIST_STEPS.md)**

---

## 🧪 Menjalankan Tes Otomatis
```bash
# Tes Otentikasi Backend (Step 2)
npm run test:auth

# Tes Integrasi Menyeluruh Localhost (Step 4)
node test_combined_run.js
```

---

## 📂 Struktur Direktori
```text
node-income-pocket-expence/
├── brief/                     # Dokumen spesifikasi produk (v01 - v04)
├── frontend/                  # Web Client (Local-First SPA)
│   ├── css/styles.css         # Styling dark fintech, responsive UI
│   ├── js/
│   │   ├── accounts.js        # Multi-saved-account switcher manager
│   │   ├── app.js             # Master frontend coordinator & event handlers
│   │   ├── flow.js            # SVG Flow Canvas (Simple & IRL modes)
│   │   ├── i18n.js            # Kamus dwibahasa (ID & EN) & formatters
│   │   └── store.js           # State store, local-first & backend sync
│   ├── index.html             # Master layout HTML
│   └── serve.js               # Standalone static preview server
├── backend/                   # Node.js + Express + SQLite Backend
│   ├── src/
│   │   ├── db.js              # SQLite connection, WAL mode & seed data
│   │   ├── middleware/auth.js # JWT & session verification
│   │   ├── routes/auth.js     # Auth, register, login, saved-accounts
│   │   ├── routes/nodes.js    # Pockets, incomes, expenses endpoints
│   │   ├── routes/transactions.js # Atomic balance & transaction ledger
│   │   ├── routes/export.js   # Dual export (.csv & .db/.sql)
│   │   └── server.js          # Combined server entrypoint
│   ├── test_auth.js           # Unit test otentikasi
│   └── package.json           # Backend dependencies
├── .env.example               # Contoh variabel lingkungan
├── .gitignore                 # Proteksi env & SQLite database
├── CHECKLIST_STEPS.md         # Panduan verifikasi Step 1 s/d Step 4
├── test_combined_run.js       # Script automated integration test Step 4
└── package.json               # Root scripts
```
