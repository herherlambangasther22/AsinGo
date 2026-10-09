import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

async function generateDefenseGuidePdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 20;
      // Header for next page
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(130, 140, 150);
      doc.text('AsinGo - Panduan Teknis & Bekal Sidang Skripsi (UMKM Pakde Sahri)', margin, 12);
      doc.setDrawColor(210, 220, 230);
      doc.line(margin, 14, pageWidth - margin, 14);
      y = 22;
    }
  }

  // Cover / Header Banner
  doc.setFillColor(33, 74, 54); // Dark emerald green
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BEKAL UJIAN SIDANG SKRIPSI: SISTEM ASINGO', margin + 6, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Rancang Bangun Aplikasi Pemesanan Ikan Asin pada UMKM Pakde Sahri', margin + 6, y + 18);
  doc.text('Menggunakan Jaringan Local Area Network (LAN) di Kab. Lampung Selatan', margin + 6, y + 24);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 230, 215);
  doc.text('Dokumen Ringkasan Arsitektur, Basis Data, Keamanan, Jaringan & Tanya-Jawab Penguji', margin + 6, y + 31);

  y += 45;

  function renderSectionHeader(num: string, title: string) {
    checkPageBreak(15);
    doc.setFillColor(240, 246, 243);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(25, 60, 45);
    doc.text(`${num}. ${title.toUpperCase()}`, margin + 3, y + 5.8);
    y += 12;
  }

  function renderParagraph(boldPrefix: string, text: string) {
    checkPageBreak(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 40, 50);
    doc.text(boldPrefix, margin + 2, y);

    const prefixWidth = doc.getTextWidth(boldPrefix);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 75);

    const splitText = doc.splitTextToSize(text, contentWidth - prefixWidth - 5);
    if (splitText.length > 0) {
      doc.text(splitText[0], margin + 2 + prefixWidth + 1, y);
      for (let i = 1; i < splitText.length; i++) {
        y += 4.5;
        checkPageBreak(8);
        doc.text(splitText[i], margin + 6, y);
      }
    }
    y += 6.5;
  }

  function renderBullet(title: string, desc: string) {
    checkPageBreak(12);
    doc.setFillColor(33, 74, 54);
    doc.circle(margin + 4, y - 1, 1, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 45, 40);
    doc.text(title + ': ', margin + 8, y);

    const titleWidth = doc.getTextWidth(title + ': ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 70, 80);

    const splitDesc = doc.splitTextToSize(desc, contentWidth - titleWidth - 10);
    if (splitDesc.length > 0) {
      doc.text(splitDesc[0], margin + 8 + titleWidth, y);
      for (let i = 1; i < splitDesc.length; i++) {
        y += 4.5;
        checkPageBreak(8);
        doc.text(splitDesc[i], margin + 8, y);
      }
    }
    y += 6.5;
  }

  function renderQA(q: string, a: string) {
    checkPageBreak(25);
    doc.setFillColor(245, 248, 252);
    doc.setDrawColor(210, 225, 245);
    
    const splitQ = doc.splitTextToSize(q, contentWidth - 10);
    const splitA = doc.splitTextToSize(a, contentWidth - 10);
    const boxHeight = (splitQ.length + splitA.length) * 4.5 + 8;
    
    checkPageBreak(boxHeight + 4);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 60, 130);
    doc.text('Dosen: ' + splitQ[0], margin + 4, y + 5);
    let curY = y + 5;
    for (let i = 1; i < splitQ.length; i++) {
      curY += 4.2;
      doc.text(splitQ[i], margin + 4, curY);
    }

    curY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 80, 50);
    doc.text('Jawaban Anda: ', margin + 4, curY);
    const ansPrefixWidth = doc.getTextWidth('Jawaban Anda: ');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 60, 70);
    doc.text(splitA[0], margin + 4 + ansPrefixWidth, curY);
    for (let j = 1; j < splitA.length; j++) {
      curY += 4.2;
      doc.text(splitA[j], margin + 4, curY);
    }

    y = curY + 7;
  }

  // SECTION 1
  renderSectionHeader('1', 'PROFIL APLIKASI & LATAR BELAKANG MASALAH');
  renderBullet('Nama Aplikasi', 'AsinGo (Aplikasi Pemesanan Ikan Asin UMKM Pakde Sahri).');
  renderBullet('Target Pengguna', 'Pemilik UMKM (Pakde Sahri), Kasir Toko, Staf Gudang, dan Pelanggan/Pembeli.');
  renderBullet('Masalah Utama', 'Kawasan pesisir Lampung Selatan sering blank-spot internet; antrean panjang karena pelanggan menanyakan harga satu per satu; kasir rawan salah hitung pecahan gramasi timbangan (100g, 250g, 500g, 1.5kg); dan nota kertas manual sering hilang atau sobek.');
  renderBullet('Solusi Sistem', 'Sistem web pemesanan mandiri berbasis Local Area Network (LAN) murni yang mandiri tanpa kuota internet, dilengkapi komputasi harga desimal presisi, kasir POS real-time, pencatatan mutasi stok otomatis, dan cetak struk thermal.');

  // SECTION 2
  renderSectionHeader('2', 'TEKNOLOGI & BAHASA PEMROGRAMAN (FULL-STACK)');
  renderBullet('Bahasa Pemrograman', 'TypeScript (Full-Stack) dan JavaScript ECMAScript 2024.');
  renderBullet('Front-End (Antarmuka)', 'React 19 (Single Page Application) dibangun dengan Vite, ditata menggunakan Tailwind CSS modern yang responsif untuk smartphone pelanggan maupun layar desktop kasir.');
  renderBullet('Back-End Server', 'Node.js dengan framework Express.js, dikonfigurasi pada port 3000 dan di-binding pada alamat 0.0.0.0 agar dapat melayani seluruh permintaan klien di jaringan LAN.');
  renderBullet('Komunikasi Real-Time', 'Server-Sent Events (SSE) pada jalur /api/events. Ketika pelanggan memesan lewat HP, server memancarkan sinyal notifikasi instan (zero latency) ke layar kasir tanpa perlu refresh peramban.');

  // SECTION 3
  renderSectionHeader('3', 'BASIS DATA (DATABASE) & KETAHANAN DATA');
  renderBullet('Jenis Database', 'Local Document-Oriented Storage berbasis format JSON terstruktur (master_database.json).');
  renderBullet('Teknik Atomic Write', 'Menerapkan prinsip ACID dengan penulisan berkas temporer yang di-swap secara atomik di tingkat sistem operasi (POSIX). Mencegah berkas rusak (corrupt) jika gerai mati listrik mendadak.');
  renderBullet('Pencadangan Otomatis', 'Mesin auto-backup berjalan setiap interval 5 menit sekali, menghasilkan berkas snapshot di data/database/backups/ lengkap dengan stempel waktu pemulihan.');

  // SECTION 4
  renderSectionHeader('4', 'ASPEK KEAMANAN SISTEM (SECURITY ARCHITECTURE)');
  renderBullet('Role-Based Access (RBAC)', 'Pengamanan peran menggunakan PIN 4 Digit: Pemilik (1234), Kasir (1111), Staf Gudang (2222), sedangkan Pelanggan umum dapat memesan mandiri tanpa PIN.');
  renderBullet('Integritas Kriptografis', 'Setiap perubahan data dihitung Tanda Tangan Digital SHA-256 (Checksum). Pemindai integritas server mendeteksi otomatis bila ada manipulasi berkas data dari luar.');
  renderBullet('Proteksi Anti Brute-Force', 'Sistem membatasi percobaan PIN yang salah. Jika terdeteksi percobaan ilegal berulang kali, IP perangkat klien akan diblokir sementara (lockout).');
  renderBullet('Audit Log Real-Time', 'Mencatat setiap transaksi, perubahan stok, dan tindakan restore beserta IP pengakses dan timestamp ke file security_audit.log.');

  // SECTION 5
  renderSectionHeader('5', 'ARSITEKTUR JARINGAN LAN & PENGALAMATAN IP');
  renderBullet('Topologi Jaringan', 'Topologi Bintang (Star Topology) berpusat pada satu unit Wireless Router / Access Point.');
  renderBullet('Segmen IP Privat', 'Kelas C Privat 192.168.1.0/24 dengan Subnet Mask 255.255.255.0.');
  renderBullet('Alokasi Router AP', '192.168.1.1 (Gateway & DHCP Server lokal, SSID: AsinGo-LAN).');
  renderBullet('Alokasi PC Server', '192.168.1.10 (IP Statik, Port Layanan 3000).');
  renderBullet('Alokasi Klien Kasir', '192.168.1.20 (DHCP Reservation terhubung ke printer thermal USB/LAN).');
  renderBullet('Alokasi Klien Gudang', '192.168.1.25 (Tablet pemantauan stok persediaan).');
  renderBullet('Alokasi Smartphone Pelanggan', '192.168.1.100 - 192.168.1.200 (DHCP Pool Dinamis untuk hingga 100 pembeli bersamaan).');
  renderBullet('Kemandirian Jaringan', '100% Offline Standalone. Seluruh paket data hanya berputar di router lokal. Latensi jaringan di bawah 15 ms dan tidak memerlukan kuota internet.');

  // SECTION 6
  renderSectionHeader('6', 'TANYA - JAWAB KRUSIAL SAAT SIDANG SKRIPSI');
  
  renderQA(
    'Mengapa menggunakan jaringan LAN lokal dan tidak menggunakan hosting cloud internet?',
    'Karena lokasi gerai UMKM Pakde Sahri berada di pesisir Lampung Selatan yang sering mengalami gangguan sinyal seluler (blank spot). Jika memakai cloud, toko tidak bisa jualan saat internet padam. Dengan LAN, aplikasi tetap beroperasi 100% normal tanpa kuota.'
  );

  renderQA(
    'Mengapa memilih database JSON terstruktur daripada MySQL atau PostgreSQL?',
    'Aplikasi dirancang mandiri (standalone) di komputer lokal UMKM tanpa perlu menginstal service RDBMS berat yang membebani RAM toko. Selain itu, dengan teknik Atomic Swap Write, data kebal dari kerusakan (corruption) saat terjadi pemadaman listrik mendadak di daerah pesisir.'
  );

  renderQA(
    'Bagaimana pesanan dari HP pembeli bisa langsung tampil di kasir tanpa kasir me-refresh layar?',
    'Aplikasi mengimplementasikan Server-Sent Events (SSE) pada rute /api/events. Server Express memancarkan event transmisi HTTP stream searah ke browser kasir secara real-time sesaat setelah pesanan disimpan ke database.'
  );

  renderQA(
    'Bagaimana Anda membuktikan bahwa aplikasi ini aman dan datanya valid?',
    'Kami menerapkan pembatasan hak akses berbasis PIN 4 Digit, proteksi anti brute-force, pencatatan IP audit log, serta perhitungan Checksum SHA-256 pada seluruh data. Jika ada baris data yang diubah paksa di luar sistem, checksum tidak cocok dan sistem mengeluarkan peringatan.'
  );

  renderQA(
    'Berapa persentase kelayakan dan tingkat keberhasilan pengujian aplikasi Anda?',
    'Pengujian Black Box terhadap 16 skenario fungsi utama menghasilkan keberhasilan 100%. Pengujian validitas ahli memperoleh skor 93,75% (Sangat Layak), dan uji praktikalitas pengguna memperoleh skor 96,92% (Sangat Praktis).'
  );

  // SECTION 7
  renderSectionHeader('7', 'ELEVATOR PITCH (RINGKASAN 60 DETIK PEMBUKA PRESENTASI)');
  checkPageBreak(28);
  doc.setFillColor(242, 248, 244);
  doc.setDrawColor(33, 74, 54);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 50, 35);
  const pitchText = 
    '"Aplikasi AsinGo adalah sistem pemesanan ikan asin berbasis web yang beroperasi pada jaringan Local Area Network (LAN) murni tanpa ketergantungan internet. Dibangun menggunakan React 19, TypeScript, dan Node.js Express, aplikasi ini menghadirkan katalog digital self-order dengan kalkulasi timbangan pecahan otomatis, sinkronisasi pesanan kasir via Server-Sent Events, manajemen stok mutasi, dan pencadangan data JSON atomik ber-enkripsi SHA-256 untuk memodernisasi UMKM Pakde Sahri di Lampung Selatan."';
  
  const splitPitch = doc.splitTextToSize(pitchText, contentWidth - 8);
  doc.text(splitPitch, margin + 4, y + 5);
  y += 30;

  // Footer for each page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 160);
    doc.text(
      `Halaman ${p} dari ${totalPages} - Panduan Teknis Skripsi AsinGo (Lampung Selatan)`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Ensure public folder exists
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, 'Panduan_Sidang_Skripsi_AsinGo.pdf');
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
  console.log(`[SUCCESS] PDF generated successfully at ${outputPath} (${pdfBytes.byteLength} bytes)`);
}

generateDefenseGuidePdf().catch((err) => {
  console.error('[PDF ERROR]', err);
  process.exit(1);
});
