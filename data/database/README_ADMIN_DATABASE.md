# 🛡️ PUSAT DATABASE RESMI & ARSIP CADANGAN SISTEM ASINGO
**PEMBERITAHUAN RESMI UNTUK ADMINISTRATOR / OWNER TOKO**

---

### 📌 INFORMASI FOLDER DATABASE
Folder ini (`data/database/`) adalah **Direktori Utama Penyimpanan Basis Data (Database Storage)** untuk seluruh sistem aplikasi **AsinGo (Toko Ikan Asin Mas Rano)**.

Semua data operasional toko disimpan di folder ini dengan standar keamanan enterprise:
- **Katalog & Stok Produk Ikan Asin** (Stok real-time, harga per kg, mutu grade, foto)
- **Riwayat Transaksi Penjualan POS Kasir** (Nota, total omset, metode pembayaran QRIS/Tunai)
- **Log Perubahan & Mutasi Stok Gudang** (Barang masuk, barang keluar, penyesuaian)
- **Pengaturan Profil Toko & WhatsApp Gateway**
- **Hak Akses & PIN Sandi Staf**

---

### 📂 STRUKTUR HIERARKI FOLDER DATABASE:

```text
data/database/
│
├── README_ADMIN_DATABASE.md      <-- [PANDUAN INI] Penjelasan folder & panduan admin
│
├── live/                         <-- FOLDER DATABASE LIVE (AKTIF REAL-TIME)
│   ├── master_database.json      <-- Master state live sistem yang tersinkronisasi atomik
│   └── db_manifest.json          <-- Verifikasi integritas kriptografi & tanda tangan digital
│
├── backups/                      <-- FOLDER SNAPSHOT & ARSIP CADANGAN (BACKUPS)
│   ├── backup_asingo_*_auto_5min.json        <-- Snapshot otomatis mandiri per 5 menit
│   ├── backup_asingo_*_manual.json           <-- Snapshot manual yang dibuat oleh Admin
│   └── backup_asingo_*_emergency_*.json      <-- Snapshot darurat otomatis sebelum restore
│
└── logs/                         <-- FOLDER LOG AUDIT KEAMANAN (SECURITY AUDIT)
    └── security_audit.log        <-- Jejak aktivitas: login, restore, backup, transaksi POS
```

---

### 🔒 FITUR KEAMANAN TINGKAT TINGGI (HIGH-LEVEL SECURITY):

1. **Integritas Kriptografi SHA-256 (Anti-Tamper Proof)**
   - Setiap file database dan snapshot dilengkapi verifikasi sidik jari hash SHA-256.
   - Sistem akan memvalidasi tanda tangan integritas untuk memastikan data tidak korup atau dimodifikasi secara ilegal dari luar.

2. **Atomic Disk Persistence (Anti-Crash & Safe Swap)**
   - Penyimpanan database menggunakan teknik penulisan atomik (`.tmp` write lalu *atomic replace*).
   - Mencegah kerusakan database jika terjadi mati lampu, crash server, atau gangguan jaringan saat proses tulis data berlangsung.

3. **Pencadangan Mandiri Real-Time 5 Menit (Autonomous Realtime Engine)**
   - Server menjalankan cron internal yang secara otomatis membuat file snapshot cadangan setiap 5 menit.
   - Dilengkapi sistem *Auto-Pruning* menjaga 50 snapshot terbaru paling sehat.

4. **Security Audit Log (Pelacakan Aktivitas Penuh)**
   - Seluruh aktivitas penting (login gagal, transaksi POS, penyesuaian stok, pembuatan backup, dan pemulihan database) dicatat secara terperinci dengan timestamp ISO dan peran pengguna di file `logs/security_audit.log`.

5. **Proteksi Brute-Force & PIN Enforced**
   - Pemulihan (*Restore*) dan penghapusan snapshot **wajib** melewati verifikasi PIN Admin (default: `1234`).
   - Sistem mendeteksi dan memblokir percobaan brute-force jika terjadi kegagalan PIN berulang kali.

6. **Emergency Rollback Protection**
   - Sebelum restore dijalankan, sistem secara otomatis mengambil snapshot instan dari database saat itu (`emergency_prerestore`), sehingga admin dapat membatalkan atau kembali ke titik sebelumnya kapan saja jika terjadi kekeliruan data.

---

### 💡 PANDUAN PENGELOLAAN UNTUK ADMIN:
- **Untuk Mengunduh Database:** Buka menu **Backup & Restore** pada aplikasi AsinGo, lalu klik tombol **Unduh JSON** pada snapshot yang diinginkan.
- **Untuk Memulihkan Data:** Klik tombol **Restore** pada snapshot di aplikasi atau unggah file JSON cadangan dengan memasukkan PIN Admin.
- **Peringatan:** Jangan menghapus file `live/master_database.json` secara manual melalui editor teks saat server sedang berjalan aktif.
