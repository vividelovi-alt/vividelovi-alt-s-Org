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
Buat tabel-tabel berikut di Supabase SQL Editor:

```sql
-- Tabel Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role TEXT CHECK (role IN ('student', 'teacher', 'admin')),
  identifier TEXT UNIQUE,
  name TEXT,
  password TEXT,
  class TEXT,
  subject TEXT
);

-- Tabel Classes
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE
);

-- Tabel Exams
CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES users(id),
  subject TEXT,
  class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Questions
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('multiple_choice', 'essay')),
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT
);

-- Tabel Submissions
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id),
  exam_id INTEGER REFERENCES exams(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  score REAL
);

-- Tabel Answers
CREATE TABLE answers (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id),
  answer_text TEXT,
  score REAL DEFAULT 0
);
```

### 2. Environment Variables
Atur variabel lingkungan berikut di Vercel atau file `.env`:
- `SUPABASE_URL`: URL API Supabase Anda.
- `SUPABASE_KEY`: Service Role Key atau Anon Key Supabase Anda.

## Cara Menjalankan Lokal
1. Clone repository.
2. Jalankan `npm install`.
3. Buat file `.env` berdasarkan `.env.example`.
4. Jalankan `npm run dev`.
