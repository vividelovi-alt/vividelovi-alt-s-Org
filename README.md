# EduSmart - Sistem Ujian Sekolah

Aplikasi manajemen ujian sekolah modern yang dibangun dengan React, Express, dan Supabase.

## Fitur
- **Siswa**: Mengerjakan ujian, melihat hasil nilai.
- **Guru**: Membuat ujian (Pilihan Ganda & Essay), koreksi essay, analisis soal.
- **Admin**: Manajemen data siswa, guru, dan kelas.

## Teknologi
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion.
- **Backend**: Express.js.
- **Database**: Supabase (PostgreSQL).

## Persiapan Deployment

### 1. Supabase Setup
Gunakan file `database.sql` yang tersedia di root proyek ini untuk membuat tabel di Supabase SQL Editor. File tersebut berisi skema lengkap termasuk relasi antar tabel dan indeks performa.

1. Buka [Dashboard Supabase](https://app.supabase.com/).
2. Pilih proyek Anda -> **SQL Editor**.
3. Salin isi dari `database.sql` dan jalankan (Run).

### 2. Environment Variables
Atur variabel lingkungan berikut di Vercel atau file `.env`:
- `SUPABASE_URL`: URL API Supabase Anda.
- `SUPABASE_KEY`: Service Role Key atau Anon Key Supabase Anda.

## Deployment ke Vercel
Aplikasi ini sudah dikonfigurasi untuk Vercel.

> [!CAUTION]
> **PENTING:** Anda WAJIB menambahkan Environment Variables di Dashboard Vercel agar aplikasi bisa terhubung ke Supabase. Tanpa ini, aplikasi akan menampilkan status "Database Offline".

1. Buka Dashboard Vercel Anda.
2. Masuk ke **Settings** -> **Environment Variables**.
3. Tambahkan dua variabel berikut:
   - `SUPABASE_URL`: (Ambil dari Dashboard Supabase -> Settings -> API)
   - `SUPABASE_KEY`: (Gunakan **service_role** key untuk akses penuh, atau **anon** key jika RLS aktif)
4. Simpan dan lakukan **Redeploy**.

## Cara Menjalankan Lokal
1. Clone repository.
2. Jalankan `npm install`.
3. Buat file `.env` berdasarkan `.env.example`.
4. Jalankan `npm run dev`.
