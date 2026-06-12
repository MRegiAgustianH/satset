# Pemisahan Fitur Penting SatSet Thesis Builder

Dokumen ini memisahkan fitur project berdasarkan fungsi utama yang terlihat dari route, controller, model, dan halaman React.

## 1. Fitur Inti

### 1.1 Editor Dokumen Skripsi

Fitur utama aplikasi adalah editor dokumen skripsi/tugas akhir berbasis halaman A4.

Kemampuan:
- Membuat dokumen dari template skripsi standar.
- Membuat dokumen kosong.
- Membuat dokumen dari outline kustom.
- Mengelola struktur BAB I sampai BAB V.
- Mengedit sub-bab secara dinamis.
- Menambah, memindah, dan menghapus bagian dokumen.
- Mengatur heading level, penomoran, paragraf, dan isi teks.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`
- `routes/web.php`

### 1.2 Format Akademik Otomatis

Aplikasi menyediakan pengaturan format dokumen akademik.

Kemampuan:
- Preset margin akademik seperti format DIKTI.
- Pengaturan font, ukuran font, spasi baris, dan indentasi paragraf.
- Penomoran halaman romawi untuk bagian awal dan angka untuk isi BAB.
- Opsi menampilkan atau menyembunyikan halaman pelengkap.
- Pengaturan gaya heading.

Bagian dokumen yang didukung:
- Sampul / cover.
- Lembar persetujuan.
- Lembar pengesahan.
- Pernyataan keaslian.
- Abstrak Indonesia.
- Abstract Inggris.
- Daftar isi.
- Daftar tabel.
- Daftar gambar.
- Daftar rumus.
- BAB I sampai BAB V.
- Daftar pustaka.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`

### 1.3 Manajemen Draft

Draft dapat disimpan, dimuat, ditampilkan, dan dihapus.

Kemampuan:
- Simpan draft manual.
- Autosave draft.
- Simpan draft ke database.
- Simpan backup draft ke file JSON.
- Tampilkan daftar draft.
- Load draft dari database atau file.
- Hapus draft beserta backup terkait.
- Simpan draft lokal di browser melalui `localStorage`.

Endpoint:
- `POST /thesis/save`
- `GET /thesis/list`
- `POST /thesis/load`
- `POST /thesis/delete`

File terkait:
- `app/Http/Controllers/ThesisController.php`
- `app/Models/ThesisDraft.php`
- `database/migrations/2026_06_04_190115_create_thesis_drafts_table.php`
- `database/migrations/2026_06_08_000000_add_slug_to_thesis_drafts.php`
- `resources/js/Pages/Thesis/Index.jsx`

## 2. Fitur AI

### 2.1 Rekomendasi Judul dan Metode

Aplikasi menggunakan Gemini untuk memberi rekomendasi judul skripsi berdasarkan fakultas, program studi, dan topik.

Kemampuan:
- Menghasilkan beberapa rekomendasi judul.
- Memberi rekomendasi metode penelitian atau algoritma.
- Menjelaskan alasan pemilihan metode.
- Menerapkan judul dan metode yang dipilih ke dokumen.

Endpoint:
- `POST /thesis/recommend-titles`

File terkait:
- `app/Http/Controllers/ThesisController.php`
- `resources/js/Pages/Thesis/Index.jsx`

### 2.2 Generator Isi Bab dan Sub-Bab

Aplikasi dapat membuat konten akademik otomatis untuk bagian tertentu.

Kemampuan:
- Generate bagian standar seperti latar belakang, rumusan masalah, teori, metodologi, pembahasan, kesimpulan, dan saran.
- Generate bagian dinamis berdasarkan sub-bab hasil outline atau impor dokumen.
- Mendukung instruksi tambahan pengguna.
- Mendukung output teks dan tabel dari AI.

Endpoint:
- `POST /thesis/generate`

File terkait:
- `app/Http/Controllers/ThesisController.php`
- `resources/js/Pages/Thesis/Index.jsx`

### 2.3 Pencarian Sitasi Akademik

Aplikasi membantu mencari referensi akademik melalui Gemini.

Kemampuan:
- Mencari referensi berdasarkan kata kunci.
- Membatasi rentang tahun publikasi.
- Menghasilkan data sitasi seperti penulis, tahun, judul, penerbit/jurnal, sumber, dan URL.
- Mengimpor hasil sitasi ke daftar pustaka.
- Mendukung format daftar pustaka APA dan IEEE.

Endpoint:
- `POST /thesis/search-citation`

File terkait:
- `app/Http/Controllers/ThesisController.php`
- `resources/js/Pages/Thesis/Index.jsx`

### 2.4 Parsing Panduan Format Dokumen

Aplikasi dapat membaca file panduan format skripsi untuk mendeteksi aturan format.

Kemampuan:
- Upload file PDF, DOCX, DOC, atau teks.
- Untuk PDF, parsing menggunakan Gemini.
- Untuk DOCX/DOC/teks, ekstrak teks lalu analisis dengan Gemini jika API key tersedia.
- Fallback ke heuristik lokal jika AI gagal atau tidak tersedia.
- Mendeteksi font, ukuran font, spasi, margin, indentasi, dan halaman wajib.

Endpoint:
- `POST /thesis/parse-guide`

File terkait:
- `app/Http/Controllers/ThesisController.php`
- `resources/js/Pages/Thesis/Index.jsx`

## 3. Fitur Import dan Export

### 3.1 Import Dokumen Word

Aplikasi dapat mengimpor dokumen Word dan memetakan isinya menjadi struktur editor.

Kemampuan:
- Import `.docx`.
- Import `.doc` berbasis HTML hasil export aplikasi.
- Memulihkan draft snapshot dari `.doc` legacy dan `.docx` hasil export aplikasi.
- Membaca pengaturan layout dasar dari file `.docx` Word murni, termasuk margin, font, spasi, indentasi, dan heading style.
- Mendeteksi BAB, sub-bab, tabel, gambar, caption, dan bagian awal dokumen.
- Mengubah hasil import menjadi blok editor.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`
- `resources/js/Pages/Thesis/features/import-export/docxLayout.js`
- Dependency: `mammoth`
- Dependency: `jszip`

### 3.2 Export PDF dan Word

Aplikasi mendukung export dokumen untuk kebutuhan akhir.

Kemampuan:
- Cetak ke PDF melalui `window.print()`.
- Export Word sebagai paket `.docx`.
- Menyisipkan snapshot draft ke dalam file Word agar bisa di-import ulang dengan format aplikasi tetap utuh.
- Pilih seluruh dokumen atau bagian tertentu.
- Split export berdasarkan bagian/BAB.
- Menjaga struktur halaman, tabel, gambar, rumus, dan daftar pustaka.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`
- `resources/js/Pages/Thesis/features/import-export/docxExport.js`
- `resources/js/Pages/Thesis/features/import-export/wordHtmlBuilders.js`
- `resources/js/Pages/Thesis/components/DownloadModal.jsx`

## 4. Fitur Konten Akademik

### 4.1 Cover Builder

Kemampuan:
- Edit elemen cover secara fleksibel.
- Mengatur judul, subtitle, penulis, NIM, prodi, fakultas, universitas, kota, dan tahun.
- Upload logo.
- Menambah, menghapus, dan memindahkan elemen cover.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`

### 4.2 Abstrak

Kemampuan:
- Menulis abstrak Bahasa Indonesia.
- Menulis abstract Bahasa Inggris.
- Mengatur kata kunci.
- Menampilkan atau menyembunyikan halaman abstrak.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`

### 4.3 Daftar Isi, Tabel, Gambar, dan Rumus

Kemampuan:
- Daftar isi otomatis dari struktur heading.
- Daftar tabel otomatis dari blok tabel.
- Daftar gambar otomatis dari blok gambar.
- Daftar rumus otomatis dari blok rumus.
- Pagination multi-halaman untuk daftar yang panjang.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`

### 4.4 Tabel, Gambar, dan Rumus

Kemampuan:
- Menambah tabel ke BAB tertentu.
- Edit tabel secara visual atau CSV.
- Merge dan split cell.
- Tambah/hapus baris dan kolom.
- Menambah gambar dan caption.
- Upload gambar.
- Menambah rumus serta rendering simbol matematika.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`

### 4.5 Daftar Pustaka

Kemampuan:
- Tambah referensi manual.
- Import hasil pencarian sitasi.
- Format daftar pustaka APA.
- Format daftar pustaka IEEE.
- Urutkan referensi.

File terkait:
- `resources/js/Pages/Thesis/Index.jsx`

## 5. Fitur Akun Bawaan Laravel Breeze

Project masih memiliki fitur autentikasi standar Laravel Breeze.

Kemampuan:
- Register.
- Login.
- Logout.
- Reset password.
- Verifikasi email.
- Konfirmasi password.
- Edit profil.
- Hapus akun.
- Dashboard sederhana setelah login.

Route terkait:
- `routes/auth.php`
- `GET /dashboard`
- `GET /profile`
- `PATCH /profile`
- `DELETE /profile`

File terkait:
- `app/Http/Controllers/Auth/*`
- `app/Http/Controllers/ProfileController.php`
- `resources/js/Pages/Auth/*`
- `resources/js/Pages/Profile/*`
- `resources/js/Pages/Dashboard.jsx`

## 6. Prioritas Fitur

### Prioritas Sangat Penting

Fitur ini adalah inti produk dan harus dipertahankan.

- Editor dokumen skripsi.
- Struktur BAB dan sub-bab.
- Format akademik otomatis.
- Cover, abstrak, daftar isi, daftar tabel, daftar gambar, daftar rumus.
- Save, load, autosave, dan delete draft.
- Export PDF/Word.
- Import Word.

### Prioritas Penting

Fitur ini memperkuat nilai utama aplikasi.

- Rekomendasi judul dan metode dengan AI.
- Generator isi BAB/sub-bab dengan AI.
- Pencarian sitasi akademik.
- Parsing panduan format dokumen.
- Daftar pustaka APA/IEEE.
- Editor tabel, gambar, dan rumus.

### Prioritas Pendukung

Fitur ini mendukung pengalaman pengguna tetapi bukan inti produk.

- Dark/light theme.
- Zoom preview.
- Toast notification.
- Sidebar dan navigasi halaman.
- Draft manager modal.
- Pengaturan heading lanjutan.

### Prioritas Opsional

Fitur ini boleh dipertahankan jika memang dibutuhkan, tetapi bisa disederhanakan jika fokus project adalah thesis builder.

- Dashboard bawaan Laravel.
- Profile user.
- Register/login jika aplikasi dipakai personal tanpa multi-user.
- Halaman Welcome bawaan Laravel yang tidak lagi dipakai sebagai landing utama.

## 7. Rekomendasi Pemisahan Modul Kode

Saat ini banyak fitur penting berada di satu file besar:

- `resources/js/Pages/Thesis/Index.jsx`

Jika project ingin dirapikan, file tersebut sebaiknya dipisah menjadi modul berikut:

- `features/thesis-editor`: struktur BAB, sub-bab, inline editor.
- `features/document-layout`: margin, font, page numbering, heading style.
- `features/cover-builder`: elemen cover dan upload logo.
- `features/references`: daftar pustaka dan pencarian sitasi.
- `features/ai-writing`: rekomendasi judul dan generator isi.
- `features/draft-manager`: save, load, delete, autosave.
- `features/import-export`: import Word, export PDF/Word.
- `features/import-export/docxLayout`: ekstraksi layout, style heading, dan snapshot dari DOCX.
- `features/import-export/docxExport`: packaging HTML dokumen menjadi file DOCX.
- `features/import-export/wordHtmlBuilders`: builder HTML Word untuk bagian khusus seperti cover.
- `features/document-blocks`: tabel, gambar, rumus.
- `components/document-preview`: render halaman A4.
- `components/modals`: welcome, draft manager, download, AI prompt, outline builder.

## 8. Ringkasan Endpoint Fitur Thesis

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/` | Menampilkan editor thesis |
| POST | `/thesis/recommend-titles` | Rekomendasi judul dan metode via Gemini |
| POST | `/thesis/generate` | Generate konten BAB/sub-bab via Gemini |
| POST | `/thesis/save` | Simpan draft |
| GET | `/thesis/list` | Ambil daftar draft |
| POST | `/thesis/load` | Muat draft |
| POST | `/thesis/delete` | Hapus draft |
| POST | `/thesis/search-citation` | Cari sitasi akademik |
| POST | `/thesis/parse-guide` | Parse panduan format dokumen |
