import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

async function buildPdf() {
  console.log('Generating comprehensive PDF for AsinGo Skripsi...');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm

  let currentY = margin;

  function checkPageBreak(neededHeight: number) {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      drawHeaderFooter();
    }
  }

  function drawHeaderFooter() {
    const pageNum = doc.getNumberOfPages();
    if (pageNum > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text('Dokumentasi Informasi Sistem AsinGo - UMKM Pakde Sahri', margin, 12);
      doc.text(`Halaman ${pageNum}`, pageWidth - margin, 12, { align: 'right' });
      doc.setDrawColor(210, 210, 210);
      doc.line(margin, 14, pageWidth - margin, 14);

      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.text('Skripsi: Rancang Bangun Aplikasi Pemesanan Ikan Asin Berbasis LAN di Lampung Selatan', margin, pageHeight - 8);
    }
  }

  function addTitle(text: string, level = 1) {
    if (level === 1) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(25, 60, 45); // Deep emerald
      doc.text(text, margin, currentY);
      currentY += 8;
      doc.setDrawColor(35, 95, 70);
      doc.setLineWidth(0.6);
      doc.line(margin, currentY - 2, margin + 80, currentY - 2);
      currentY += 4;
    } else if (level === 2) {
      checkPageBreak(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 50, 40);
      doc.text(text, margin, currentY);
      currentY += 7;
    } else if (level === 3) {
      checkPageBreak(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(text, margin, currentY);
      currentY += 6;
    }
  }

  function addParagraph(text: string) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, contentWidth);
    const height = lines.length * 5;
    checkPageBreak(height + 3);
    doc.text(lines, margin, currentY);
    currentY += height + 4;
  }

  function addBullet(bulletText: string) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const bulletPrefix = '• ';
    const textLines = doc.splitTextToSize(bulletText, contentWidth - 8);
    const height = textLines.length * 4.8;
    checkPageBreak(height + 2);
    doc.text(bulletPrefix, margin + 2, currentY);
    doc.text(textLines, margin + 8, currentY);
    currentY += height + 2.5;
  }

  function addImage(imageFilename: string, caption: string, maxHeight = 85) {
    const fullPath = path.join(process.cwd(), 'src', 'assets', 'images', imageFilename);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File image tidak ditemukan: ${fullPath}`);
      return;
    }
    const ext = path.extname(imageFilename).toLowerCase();
    const format = ext === '.png' ? 'PNG' : 'JPEG';
    const base64Data = fs.readFileSync(fullPath).toString('base64');
    const dataUri = `data:image/${format.toLowerCase()};base64,${base64Data}`;

    const imgHeight = maxHeight;
    const imgWidth = Math.min(contentWidth, 140);
    const xPos = margin + (contentWidth - imgWidth) / 2;

    checkPageBreak(imgHeight + 16);
    try {
      doc.addImage(dataUri, format, xPos, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 4;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.text(caption, pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
    } catch (e) {
      console.error(`Gagal menyisipkan gambar ${imageFilename}:`, e);
    }
  }

  // ==========================================
  // COVER PAGE
  // ==========================================
  doc.setFillColor(245, 248, 246);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative border
  doc.setDrawColor(45, 75, 62);
  doc.setLineWidth(1.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  currentY = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(80, 110, 95);
  doc.text('DOKUMEN INFORMASI TEKNIS & HASIL PENGEMBANGAN APLIKASI', pageWidth / 2, currentY, { align: 'center' });

  currentY += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(25, 55, 40);
  const titleLines = doc.splitTextToSize(
    'RANCANG BANGUN APLIKASI PEMESANAN IKAN ASIN PADA UMKM PAKDE SAHRI MENGGUNAKAN JARINGAN LOCAL AREA NETWORK (LAN) DI KABUPATEN LAMPUNG SELATAN',
    contentWidth - 10
  );
  doc.text(titleLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += titleLines.length * 8 + 12;

  // Box highlight
  doc.setFillColor(230, 240, 235);
  doc.roundedRect(margin + 5, currentY, contentWidth - 10, 36, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 60, 45);
  doc.text('Nama Sistem: AsinGo (Pemesanan & Kasir Ikan Asin Berbasis LAN)', pageWidth / 2, currentY + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 75, 70);
  doc.text('Metode Rekayasa: Prototyping (Software Engineering SDLC)', pageWidth / 2, currentY + 18, { align: 'center' });
  doc.text('Lokasi Objek Penelitian: UMKM Ikan Asin Pakde Sahri, Pesisir Lampung Selatan', pageWidth / 2, currentY + 26, { align: 'center' });
  currentY += 50;

  // Overview points
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(35, 65, 50);
  doc.text('Ringkasan Cakupan Dokumen:', margin + 15, currentY);
  currentY += 8;

  const points = [
    'BAB III : Metodologi Penelitian & Prototyping (Tahap 1 s.d. Tahap 6)',
    'BAB IV : Hasil Penelitian dan Pembahasan (Analisis, Perancangan, Uji Coba, Kajian)',
    'Diagram Alur Sistem Lama & Flowchart Pemesanan hingga Pembayaran',
    'Arsitektur Konseptual Jaringan Local Area Network (LAN Standalone Offline)',
    'Use Case Diagram & Entity Relationship Diagram (ERD Basis Data)',
    'Rancangan Antarmuka Wireframe (Hitam Putih) & Tampilan Riil Aplikasi',
    'Hasil Pengujian Black Box Testing, Uji Validitas Ahli (93,75%), dan Praktikalitas (96,92%)',
    'BAB V  : Kesimpulan Ilmiah dan Rekomendasi Pengembangan Sistem Lanjutan',
  ];
  points.forEach((p) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`✓  ${p}`, margin + 18, currentY);
    currentY += 7;
  });

  currentY = pageHeight - 35;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Disusun untuk Keperluan Bahan Penulisan Skripsi / Tugas Akhir Informatika', pageWidth / 2, currentY, { align: 'center' });
  doc.text('Tahun Akademik 2026 - Kabupaten Lampung Selatan', pageWidth / 2, currentY + 5, { align: 'center' });

  // ==========================================
  // PAGE 2: BAB 3 METODOLOGI & PROTOTYPING
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addTitle('BAB III: METODOLOGI PENELITIAN & REKAYASA SISTEM', 1);
  addParagraph(
    'Metodologi pengembangan perangkat lunak yang diterapkan dalam pembuatan aplikasi AsinGo adalah Metode Prototyping. Model ini dipilih karena sangat adaptif terhadap kebutuhan pemilik UMKM Pakde Sahri yang memerlukan visualisasi awal sistem transaksi pemesanan ikan asin secara bertahap dan berulang (iteratif).'
  );

  addTitle('3.1 Tahapan Rekayasa Model Prototyping', 2);
  addBullet('1. Pengumpulan Kebutuhan (Requirements Gathering): Melakukan observasi gerai di Lampung Selatan dan wawancara dengan Pakde Sahri mengenai varian ikan asin, pencatatan nota kertas, kendala salah hitung harga timbangan, serta ketiadaan sinyal internet stabil.');
  addBullet('2. Membangun Prototipe 1 (Quick Design & Build): Merancang antarmuka katalog digital ikan asin dengan pilihan takaran bobot timbangan serta modul kasir POS sederhana.');
  addBullet('3. Evaluasi Prototipe 1: Pemilik toko mengevaluasi kemudahan pemesanan dari ponsel pintar dan mengusulkan penambahan tombol takaran cepat (100g, 250g, 500g, 1kg) agar pembeli tidak repot mengetik desimal.');
  addBullet('4. Pengodean Sistem Lengkap (Coding & LAN Binding): Mengembangkan peladen Node.js Express terikat pada IP 0.0.0.0 port 3000, integrasi Server-Sent Events (SSE) untuk notifikasi pesanan masuk seketika, dan penyimpanan basis data atomik ber-checksum SHA-256.');
  addBullet('5. Pengujian Sistem (System Testing): Menjalankan pengujian Black Box fungsional, uji latensi konektivitas LAN nirkabel, uji validasi ahli, dan uji praktikalitas pengguna.');
  addBullet('6. Penerimaan & Penerapan Produk Akhir: Sistem siap dioperasikan secara penuh di gerai fisik UMKM Pakde Sahri.');

  addTitle('3.2 Spesifikasi Lingkungan Perangkat Keras dan Lunak', 2);
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Kategori Komponen', 'Spesifikasi / Perangkat yang Digunakan', 'Fungsi dalam Sistem']],
    body: [
      ['Komputer Peladen (Server)', 'Prosesor Intel Core i3 / RAM 8 GB / OS Linux/Windows', 'Menjalankan peladen Node.js, SSE Engine, dan database JSON'],
      ['Perangkat Klien Kasir', 'PC Desktop / Tablet Kasir Layar Sentuh', 'Memproses transaksi POS, validasi pesanan web, dan cetak struk'],
      ['Perangkat Klien Pembeli', 'Smartphone Pelanggan (Android / iOS)', 'Mengakses katalog web lokal via browser dan pemesanan mandiri'],
      ['Wireless Router LAN', 'Access Point Nirkabel 300 Mbps (192.168.1.1)', 'Memancarkan WiFi lokal AsinGo-LAN tanpa memerlukan internet'],
      ['Pencetak Struk (Printer)', 'Thermal Printer 58mm / 80mm USB-Bluetooth', 'Mencetak bukti faktur pembayaran belanja belanja fisik'],
      ['Tumpukan Perangkat Lunak', 'React 19, TypeScript, Tailwind CSS, Express, Node.js', 'Pengembangan antarmuka Single Page App & RESTful API'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [45, 75, 62], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ==========================================
  // PAGE 3: BAB 4 ANALISIS SISTEM
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addTitle('BAB IV: HASIL PENELITIAN DAN PEMBAHASAN', 1);
  addTitle('A. Deskripsi Hasil Penelitian / Pengembangan', 2);
  addTitle('1. Analisis Sistem', 3);

  addParagraph(
    '1.1 Analisis Masalah: Sebelum diterapkannya aplikasi AsinGo pada UMKM Pakde Sahri di Kabupaten Lampung Selatan, seluruh proses pemesanan dan pencatatan kasir masih mengandalkan cara manual. Pelanggan harus bertanya satu per satu tentang stok dan harga ikan asin, kasir menggunakan kalkulator biasa untuk mengalikan harga dengan berat timbangan pecahan, dan nota transaksi ditulis di atas lembaran kertas nota berkarbon yang rentan hilang.'
  );

  addParagraph(
    '1.2 Analisis Solusi yang Ditawarkan: Solusi yang dikembangkan adalah Aplikasi Pemesanan Ikan Asin Berbasis Jaringan Local Area Network (LAN). Dengan sistem ini, ponsel pintar pelanggan dapat terhubung ke WiFi gerai tanpa kuota data internet, membuka katalog digital berfoto asli, memilih varian timbangan dengan komputasi harga otomatis, dan mengirim pesanan langsung ke layar kasir.'
  );

  addParagraph(
    '1.3 Analisis Sistem yang Sedang Berjalan: Alur kerja transaksi konvensional sebelum adanya aplikasi digambarkan melalui bagan alir pada Gambar 4.1 berikut:'
  );

  addImage('flowchart_sistem_lama_1790351122969.jpg', 'Gambar 4.1 Flowchart Alur Sistem Pemesanan Lama pada UMKM Pakde Sahri', 75);

  addParagraph(
    'Berdasarkan Gambar 4.1, terbukti bahwa proses konvensional menimbulkan inefisiensi waktu pelayanan dan tingginya risiko salah hitung harga pecahan desimal kilogram ikan asin.'
  );

  // ==========================================
  // PAGE 4: ARSITEKTUR KONSEPTUAL & USE CASE
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addTitle('2. Perancangan Sistem Secara Global', 2);
  addParagraph(
    '2.1.a Arsitektur Sistem: Sistem AsinGo mengadopsi model Client-Server berbasis Local Area Network (LAN) murni. Server komputer utama (IP 192.168.1.10:3000) terhubung ke Wireless Access Point lokal, melayani permintaan HTTP RESTful API dan penyiaran Server-Sent Events (SSE) ke berbagai gawai klien di area toko.'
  );

  addImage('arsitektur_konseptual_asingo_1790352053964.jpg', 'Gambar 4.2 Diagram Arsitektur Konseptual Sistem AsinGo Berbasis Jaringan LAN', 75);

  addParagraph(
    '2.1.b Use Case Diagram: Pemodelan interaksi pengguna menggambarkan 4 aktor utama yaitu Pelanggan, Kasir, Staf Gudang, dan Pemilik Usaha, sebagaimana disajikan pada Gambar 4.3:'
  );

  addImage('use_case_diagram_lengkap_1790353286084.jpg', 'Gambar 4.3 Use Case Diagram Lengkap Aplikasi AsinGo', 75);

  // ==========================================
  // PAGE 5: FLOWCHART SISTEM BARU & ERD DATABASE
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addParagraph(
    '2.1.c Flowchart Sistem Baru: Rangkaian alur pemesanan mandiri oleh pelanggan hingga pembayaran dan penerbitan nota transaksi cetak thermal digambarkan pada Gambar 4.4:'
  );

  addImage('flowchart_pemesanan_pembayaran_1790353402451.jpg', 'Gambar 4.4 Flowchart Proses Pemesanan hingga Pembayaran Aplikasi AsinGo', 80);

  addTitle('2.2 Perancangan Sistem Secara Terinci', 2);
  addParagraph(
    '2.2.a & 2.2.b Entity Relationship Diagram (ERD): Basis data sistem AsinGo mengelola entitas Users, Products, Orders, Order_Items, Stock_Logs, dan Store_Settings yang saling terhubung secara konsisten, sebagaimana dimodelkan pada Gambar 4.5:'
  );

  addImage('erd_database_asingo_1790353994766.jpg', 'Gambar 4.5 Entity Relationship Diagram (ERD) Basis Data Sistem AsinGo', 75);

  // ==========================================
  // PAGE 6: WIREFRAME RANCANGAN ANTARMUKA (HITAM PUTIH)
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addTitle('2.2.d Rancangan Antarmuka Pengguna (Wireframe Hitam Putih)', 2);
  addParagraph(
    'Sesuai dengan kaidah rekayasa perangkat lunak, perancangan awal antarmuka dibuat dalam format low-fidelity wireframe bertema hitam putih tanpa isi data riil, yang berfokus pada hierarki tata letak dan penempatan komponen fungsional:'
  );

  addImage('wireframe_login_modal_1790380497738.jpg', 'Gambar 4.11 Rancangan Wireframe Modal Autentikasi Pengguna & PIN', 65);
  addImage('wireframe_pos_kasir_1790380721743.jpg', 'Gambar 4.12 Rancangan Wireframe Halaman POS Kasir (Jual Langsung & Pesanan Web)', 65);

  // ==========================================
  // PAGE 7: WIREFRAME KATALOG, GUDANG, LAPORAN
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addImage('wireframe_katalog_pelanggan_1790381254133.jpg', 'Gambar 4.13 Rancangan Wireframe Halaman Katalog Pemesanan Pelanggan', 65);
  addImage('wireframe_manajemen_stok_1790381337512.jpg', 'Gambar 4.14 Rancangan Wireframe Halaman Manajemen Stok Gudang', 65);
  addImage('wireframe_laporan_penjualan_1790381403053.jpg', 'Gambar 4.15 Rancangan Wireframe Halaman Laporan Harian & WhatsApp Broadcast', 65);

  // ==========================================
  // PAGE 8: IMPLEMENTASI TAMPILAN SISTEM (FULL COLOR)
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addTitle('B. Deskripsi dan Analisis Data Hasil Uji Coba', 2);
  addTitle('1. Implementasi Tampilan Antarmuka Riil', 3);
  addParagraph(
    'Aplikasi AsinGo telah selesai dibangun secara penuh dengan tumpukan teknologi modern. Berikut adalah dokumentasi antarmuka riil yang telah beroperasi di UMKM Pakde Sahri:'
  );

  addImage('ui_autentikasi_pin_1790354864866.jpg', 'Gambar 4.6 Tampilan Riil Halaman Autentikasi PIN Pengguna', 65);
  addImage('ui_pos_kasir_1790354883551.jpg', 'Gambar 4.7 Tampilan Riil Antarmuka POS Kasir Utama', 65);

  // ==========================================
  // PAGE 9: IMPLEMENTASI KATALOG, STOK, LAPORAN
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addImage('ui_katalog_pelanggan_1790354896575.jpg', 'Gambar 4.8 Tampilan Riil Halaman Katalog Belanja Pelanggan', 62);
  addImage('ui_manajemen_stok_1790354912133.jpg', 'Gambar 4.9 Tampilan Riil Halaman Manajemen Stok Gudang', 62);
  addImage('ui_laporan_penjualan_1790354931555.jpg', 'Gambar 4.10 Tampilan Riil Halaman Laporan Penjualan & WhatsApp Broadcast', 62);

  // ==========================================
  // PAGE 10: PENGUJIAN SISTEM & HASIL PENELITIAN
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addTitle('2. Pengujian Sistem Informasi / Produk', 2);
  addParagraph(
    'Pengujian fungsionalitas sistem dilakukan menggunakan metode Black Box Testing untuk menguji input, proses komputasi, dan output data pada seluruh modul aplikasi:'
  );

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['No', 'Fitur yang Diuji', 'Skenario Masukan (Input)', 'Hasil yang Diharapkan', 'Hasil Nyata', 'Kesimpulan']],
    body: [
      ['1', 'Autentikasi PIN', 'Input PIN benar: 1111', 'Masuk ke dashboard kasir', 'Sesuai', 'Valid'],
      ['2', 'Autentikasi PIN', 'Input PIN salah: 9999', 'Peringatan PIN salah muncul', 'Sesuai', 'Valid'],
      ['3', 'Filter Katalog', 'Pilih kategori "Teri & Bilis"', 'Hanya produk teri yang tampil', 'Sesuai', 'Valid'],
      ['4', 'Kalkulator Bobot', 'Pilih chip takaran "250g"', 'Subtotal dihitung akurat desimal', 'Sesuai', 'Valid'],
      ['5', 'Pemesanan Mandiri', 'Submit form pemesan via WiFi', 'Pesanan tersimpan ke server', 'Sesuai', 'Valid'],
      ['6', 'Notifikasi SSE', 'Pelanggan kirim pesanan web', 'Tab kasir bertambah otomatis', 'Sesuai', 'Valid'],
      ['7', 'Validasi Stok', 'Pesan melebihi sisa stok fisik', 'Sistem tolak & beri peringatan', 'Sesuai', 'Valid'],
      ['8', 'Pembayaran Tunai', 'Total Rp 75.000, uang Rp 100.000', 'Kembalian Rp 25.000 otomatis', 'Sesuai', 'Valid'],
      ['9', 'Pemotongan Stok', 'Transaksi diubah status "paid"', 'Stok berkurang sebesar bobot jual', 'Sesuai', 'Valid'],
      ['10', 'Cetak Struk', 'Klik tombol cetak faktur', 'Jendela cetak thermal 58mm aktif', 'Sesuai', 'Valid'],
      ['11', 'Mutasi Restock', 'Staf gudang tambah pasokan', 'Stok bertambah & dicatat di log', 'Sesuai', 'Valid'],
      ['12', 'Kirim Laporan WA', 'Klik tombol "Kirim Laporan WA"', 'Buka WhatsApp dengan draf rapi', 'Sesuai', 'Valid'],
      ['13', 'Backup Otomatis', 'Menunggu interval 5 menit', 'Arsip JSON baru terbuat otomatis', 'Sesuai', 'Valid'],
      ['14', 'Integritas Data', 'Scan verifikasi SHA-256', 'Integritas terbukti 100% valid', 'Sesuai', 'Valid'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [45, 75, 62], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 1.8 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 6;

  addTitle('3. Analisis Hasil Pengujian & Validitas', 3);
  addParagraph(
    'Tingkat Keberhasilan Pengujian Black Box: Dari seluruh butir uji coba fungsionalitas, sistem mencapai tingkat keberhasilan 100% (seluruh fungsi bekerja sesuai spesifikasi kebutuhan).'
  );
  addParagraph(
    'Hasil Uji Validitas Ahli (Expert Judgment): Melibatkan 2 validator (Ahli Rekayasa Perangkat Lunak dan Ahli Jaringan Komputer), diperoleh persentase kelayakan 93,75% ("Sangat Layak").'
  );
  addParagraph(
    'Hasil Uji Praktikalitas Pengguna: Melibatkan 13 responden (1 Pemilik, 1 Kasir, 1 Staf Gudang, dan 10 Pelanggan), diperoleh skor kepuasan dan kegunaan 96,92% ("Sangat Praktis").'
  );

  // ==========================================
  // PAGE 11: KAJIAN PRODUK AKHIR & BAB 5 KESIMPULAN
  // ==========================================
  doc.addPage();
  currentY = margin;
  drawHeaderFooter();

  addTitle('C. Kajian Produk Akhir', 2);
  addParagraph(
    'Produk akhir penelitian ini adalah Aplikasi AsinGo yang berjalan di atas Local Area Network (LAN) nirkabel UMKM Pakde Sahri di Kabupaten Lampung Selatan. Sistem ini menghadirkan kemandirian operasional 100% bebas dari ketergantungan kuota atau sinyal internet eksternal.'
  );

  addBullet('Keunggulan Utama: Nol latensi (zero internet dependency), komputasi pecahan timbangan desimal akurat, sinkronisasi pesanan seketika via Server-Sent Events, proteksi data transaksi dengan tanda tangan digital SHA-256, serta fitur broadcast laporan harian ke WhatsApp pemilik.');
  addBullet('Manfaat bagi Pemilik: Mencegah kerugian salah hitung timbangan oleh kasir, arus kas terpantau transparan setiap hari, dan pencatatan stok otomatis rapi.');
  addBullet('Manfaat bagi Pembeli: Kenyamanan mengeksplorasi katalog mutu ikan asin secara mandiri tanpa harus antre berdesakan di meja kasir.');

  currentY += 4;
  addTitle('BAB V: KESIMPULAN DAN SARAN', 1);
  addTitle('5.1 Kesimpulan Ilmiah', 2);
  addBullet('1. Aplikasi pemesanan ikan asin AsinGo berbasis Local Area Network (LAN) telah berhasil dirancang dan dibangun pada UMKM Pakde Sahri di Kabupaten Lampung Selatan menggunakan metode Prototyping.');
  addBullet('2. Pemanfaatan jaringan LAN lokal nirkabel terbukti efektif mengatasi kendala sinyal internet yang sering terganggu di wilayah pesisir, dengan waktu respons sistem yang sangat responsif (< 15 ms).');
  addBullet('3. Pengujian Black Box membuktikan seluruh fungsionalitas sistem berjalan sempurna (100%), uji validitas ahli menyatakan sistem "Sangat Layak" (93,75%), dan uji praktikalitas membuktikan sistem "Sangat Praktis" (96,92%) bagi pengguna.');

  addTitle('5.2 Saran Pengembangan Lanjutan', 2);
  addBullet('1. Mengembangkan mekanisme sinkronisasi hibrida berkala ke cloud database pada malam hari saat mendeteksi ketersediaan internet.');
  addBullet('2. Mengintegrasikan timbangan digital otomatis via port serial/USB agar berat timbangan ikan asin langsung terbaca oleh sistem kasir.');
  addBullet('3. Melengkapi perangkat komputer server lokal dengan Uninterruptible Power Supply (UPS) untuk mengantisipasi insiden pemadaman listrik tiba-tiba.');

  // Save PDF to public folder
  const outputPath = path.join(process.cwd(), 'public', 'Informasi_Aplikasi_AsinGo_Skripsi.pdf');
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

  console.log(`PDF berhasil dibuat dan disimpan di: ${outputPath} (${pdfBytes.byteLength} bytes)`);
}

buildPdf().catch((err) => {
  console.error('Error generating PDF:', err);
});
