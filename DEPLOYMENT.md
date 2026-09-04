# Deployment Poin Breaktime ke Vercel

## 1. Persiapan

Pastikan proyek tersimpan di GitHub dan file `.env` tidak ikut di-commit. File `.gitignore` proyek sudah mengabaikan `.env`.

## 2. Buat proyek Vercel

1. Buka https://vercel.com/new.
2. Pilih **Import Git Repository**, lalu pilih repositori Poin Breaktime.
3. Gunakan **Framework Preset: Other**.
4. Biarkan **Root Directory** pada akar repositori.
5. Konfigurasi build dan routing akan dibaca dari `vercel.json`.

## 3. Tambahkan Environment Variables

Tambahkan variabel berikut untuk environment Production, Preview, dan Development:

- `SUPABASE_URL`: URL proyek Supabase, misalnya `https://PROJECT_REF.supabase.co`.
- `SUPABASE_ANON_KEY`: anon/publishable key Supabase untuk operasi baca Viewer.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key untuk operasi tulis dari API server.
- `ADMIN_PASSWORD`: kata sandi untuk berpindah ke mode Admin.
- `ADMIN_SESSION_SECRET`: string acak minimal 32 karakter untuk menandatangani token sesi Admin.

Jangan memakai awalan `VITE_` atau `NEXT_PUBLIC_` untuk service role key. Semua akses Supabase pada aplikasi ini dilakukan oleh API server.

## 4. Deploy dan uji

1. Klik **Deploy**.
2. Buka URL hasil deployment.
3. Pastikan Dashboard dapat terbuka sebagai Viewer.
4. Coba kata sandi yang salah dan pastikan tetap Viewer.
5. Coba kata sandi Admin yang benar.
6. Lakukan satu perubahan kecil melalui UI dan pastikan perubahan muncul setelah halaman dimuat ulang.

Jika variabel lingkungan diubah setelah deployment, jalankan **Redeploy** dari halaman Deployments.
