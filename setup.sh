#!/bin/bash

echo "------------------------------------------------"
echo "   PRESISI - Sistem Ujian Sekolah Installer    "
echo "------------------------------------------------"

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "Error: Node.js belum terinstall. Silakan install Node.js terlebih dahulu."
    exit
fi

echo "1. Menginstall dependensi..."
npm install

echo "2. Menyiapkan file environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "File .env telah dibuat. Silakan isi SUPABASE_URL dan SUPABASE_KEY di file tersebut."
fi

echo "3. Membangun aplikasi..."
npm run build

echo "------------------------------------------------"
echo "Instalasi Selesai!"
echo "Untuk menjalankan aplikasi, gunakan: npm start"
echo "Aplikasi akan berjalan di http://localhost:3000"
echo "------------------------------------------------"
