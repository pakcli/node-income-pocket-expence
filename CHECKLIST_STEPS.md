# Panduan Pengujian Setiap Step (Verification Guide)
## Student Pocket Manager (Brief v04 Specification)

Dokumen ini memuat panduan lengkap untuk memeriksa dan memverifikasi hasil pengerjaan dari **Step 1 sampai Step 4** secara berurutan.

---

## Ringkasan Akun Demo Bawaan (Default Seed Data)
Untuk mempermudah pengujian, sistem telah dilengkapi akun bawaan sesuai **Brief v04 Section 2.2**:

| Nama Profil | Email | Password | Role | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Budi Pratama** | `budi.pratama@student.id` | `student123` | `student` | Akun Siswa/Mahasiswa aktif default |
| **Hendra Pratama (Ayah)** | `hendra.pratama@gmail.com` | `parent123` | `parent` | Akun Orang Tua (Sponsor & Monitor) |
| **Dewi Pratama (Ibu)** | `dewi.pratama@gmail.com` | `parent123` | `parent` | Akun Orang Tua (Sponsor & Monitor) |

---

## 📋 STEP 1: Frontend Static Local First Only
Tujuan: Memverifikasi tampilan UI frontend berjalan 100% secara lokal dan mandiri tanpa backend.

### Cara Menjalankan & Memeriksa:
1. Buka terminal di folder root project `d:\0pro\node-income-pocket-expence`:
   ```bash
   node frontend/serve.js
   ```
   *(Atau buka langsung file `frontend/index.html` di browser Google Chrome / Edge)*
2. Buka browser di alamat:
   **[http://localhost:3000](http://localhost:3000)**

### Fitur yang Dapat Dicek di UI:
- [x] **Dual Mode Visual Flow:**
  - Klik tombol **Simple**: Menampilkan pipeline 3 kolom linier (`Pemasukan` → `Kantong/Rekening` → `Pos Pengeluaran`).
  - Klik tombol **IRL Flow**: Menampilkan grafik jaringan realistis dengan alur transfer antar dompet (garis putus-putus ungu).
- [x] **Precision Table View (Buku Kas):**
  - Klik tab **Buku Kas (Table View)** pada navbar tengah: Menampilkan tabel mutasi dengan kolom `Tanggal`, `Jenis`, `Perubahan`, `Saldo Berjalan`, `Dari`, `Tujuan`, `Kantong`, dan `Catatan`.
  - Coba kotak pencarian (*Search*) dan filter pill (*Semua*, *Pemasukan*, *Pengeluaran*, *Pindah Saldo*).
- [x] **Split View:** Klik tab **Split View** untuk melihat Kanvas Alur dan Buku Kas secara bersisian.
- [x] **Node Inspector:** Klik salah satu kartu node (misal *Dompet Fisik* atau *Makan & Minum*) di kanvas. Sidebar kanan (380px) akan langsung terisi saldo, total alur masuk/keluar, dan riwayat transaksi khusus node tersebut.
- [x] **Multi-Language Switcher (i18n):**
  - Klik tombol **🇮🇩 ID / 🇺🇸 EN** di kanan atas.
  - Seluruh teks label dan format mata uang (`Rp` vs `$`) langsung berganti seketika.
- [x] **Quick Action Modal:**
  - Klik tombol `+ Pemasukan`: Catat dana baru.
  - Klik tombol `- Pengeluaran`: Catat pengeluaran baru.
  - Klik tombol `⇄ Pindah Saldo`: Transfer saldo antar kantong.
  - Klik tombol `+ Kantong Baru`: Buat dompet tunai, rekening bank, atau e-wallet baru.
- [x] **Dual Export Menu:**
  - Klik tombol **Ekspor** di navbar kanan atas.
  - Pilih **Unduh Spreadsheet (.csv)**: File `.csv` langsung terunduh.
  - Pilih **Unduh SQLite (.sql / .db)**: File dump SQL/SQLite langsung terunduh.

---

## 🔐 STEP 2: Auth Only
Tujuan: Memverifikasi backend otentikasi (JWT, enkripsi bcrypt, SQLite schema, multi-tenant data isolation, dan pairing keluarga).

### Cara Menjalankan & Memeriksa:
1. Jalankan unit test otentikasi mandiri:
   ```bash
   npm run test:auth
   ```
   *Atau:*
   ```bash
   cd backend
   node test_auth.js
   ```
2. **Hasil yang diharapkan:**
   ```text
   [PASS] Users seeded in SQLite (3 users):
      - Budi Pratama (student): budi.pratama@student.id
      - Hendra Pratama (Ayah) (parent): hendra.pratama@gmail.com
      - Dewi Pratama (Ibu) (parent): dewi.pratama@gmail.com
   [PASS] Password verification for Budi Pratama: MATCHED
   [PASS] JWT Token Generation & Verification: Valid for user ID usr_student_1
   [PASS] Family Relations (2 connections):
      - Parent Hendra Pratama (Ayah) -> Student Budi Pratama [active]
      - Parent Dewi Pratama (Ibu) -> Student Budi Pratama [active]
   🎉 ALL AUTH UNIT TESTS PASSED SUCCESSFULLY!
   ```

---

## 🔄 STEP 3: Combine Run Localhost Combined
Tujuan: Memverifikasi integrasi penuh antara frontend dengan backend REST API (routing API `/api/auth`, `/api/nodes`, `/api/transactions`, `/api/export` serta serving statis frontend).

### Struktur Integrasi:
- **`backend/src/server.js`**: Menyajikan REST API sekaligus menyajikan file static `frontend/`.
- **`frontend/js/store.js` & `frontend/js/accounts.js`**: Berkomunikasi langsung dengan endpoint API backend dan otomatis fallback jika offline.
- File konfigurasi `.env` dan `.env.example` telah disiapkan dan dilindungi oleh `.gitignore`.

---

## 🚀 STEP 4: Run Local Combined (Full Integration Test)
Tujuan: Menjalankan server terpadu dan memverifikasi seluruh alur operasional di localhost port 3000.

### Cara Menjalankan Server Terpadu:
Dari root folder `d:\0pro\node-income-pocket-expence`:
```bash
npm start
```
*(Atau `node backend/src/server.js`)*

Server akan aktif di:
- **Web App Terpadu:** [http://localhost:3000](http://localhost:3000)
- **API Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **Saved Accounts API:** [http://localhost:3000/api/auth/saved-accounts](http://localhost:3000/api/auth/saved-accounts)

### Cara Menjalankan Automated Verification Test:
Jalankan script verifikasi otomatis yang menguji seluruh endpoint secara end-to-end:
```bash
node test_combined_run.js
```

### Hasil Test Otomatis Step 4:
```text
🚀 [Step 4] Starting Combined Localhost Integration Tests on port 3124

--- Test 1: Static Frontend Delivery ---
[PASS] GET / -> HTTP 200 (21234 bytes)
[PASS] GET /css/styles.css -> HTTP 200 (17224 bytes)
[PASS] GET /js/app.js -> HTTP 200 (24676 bytes)

--- Test 2: API Health Check ---
[PASS] GET /api/health -> HTTP 200: {"status":"ok","version":"v04"}

--- Test 3: Multi-Saved-Account Switcher API ---
[PASS] GET /api/auth/saved-accounts -> HTTP 200 (3 accounts returned)

--- Test 4: 1-Click Profile Switch ---
[PASS] POST /api/auth/switch-account -> HTTP 200
       Active Profile: Budi Pratama (student), Token Issued.

--- Test 5: Authenticated Nodes API ---
[PASS] GET /api/nodes -> HTTP 200 (Pockets: 3, Incomes: 2, Expenses: 3)

--- Test 6: Authenticated Transactions API ---
[PASS] GET /api/transactions -> HTTP 200 (Transactions Count: 5)

--- Test 7: Dual Export Engine ---
[PASS] GET /api/export/csv -> HTTP 200 (Content-Type: text/csv)
[PASS] GET /api/export/db -> HTTP 200 (Content-Type: application/sql)

🎉 ALL STEP 4 COMBINED LOCALHOST INTEGRATION TESTS PASSED 100%!
```

### Pengujian Interaktif di Browser (1-Click Account Switcher):
1. Buka [http://localhost:3000](http://localhost:3000).
2. Di pojok kanan atas, klik avatar profil **Budi Pratama (STUDENT)**.
3. Menu dropdown menampilkan profil tersimpan:
   - `Budi Pratama (Student)` [ACTIVE]
   - `Hendra Pratama (Ayah)` [SWITCH]
   - `Dewi Pratama (Ibu)` [SWITCH]
   - `+ Tambah Akun Keluarga`
4. Klik tombol **[SWITCH]** pada Hendra Pratama:
   - Profil langsung berganti tanpa logout atau ketik password ulang.
   - Token baru otomatis diterbitkan dan data keuangan disesuaikan seketika.
