import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, Product, StoreSettings } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWeight(kg: number): string {
  if (kg < 1) {
    return `${Math.round(kg * 1000)} gram`;
  }
  return `${kg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;
}

export function formatDateIndo(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTimeIndo(dateString: string): string {
  try {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateString;
  }
}

// WhatsApp Daily Sales Recap generator
export function generateWhatsAppDailyRecapText(
  orders: Order[],
  selectedDate: string,
  settings: StoreSettings,
  products: Product[]
): string {
  const filteredOrders = orders.filter((o) => o.createdAt.startsWith(selectedDate));
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const totalDiscount = filteredOrders.reduce((sum, o) => sum + o.discount, 0);
  
  // Calculate total kg sold
  let totalKg = 0;
  const itemMap: { [name: string]: { qty: number; total: number } } = {};
  
  filteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      totalKg += item.quantityKg;
      if (!itemMap[item.productName]) {
        itemMap[item.productName] = { qty: 0, total: 0 };
      }
      itemMap[item.productName].qty += item.quantityKg;
      itemMap[item.productName].total += item.subtotal;
    });
  });

  // Payment Breakdown
  const cashTotal = filteredOrders.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.finalTotal, 0);
  const qrisTotal = filteredOrders.filter((o) => o.paymentMethod === 'qris').reduce((s, o) => s + o.finalTotal, 0);
  const transferTotal = filteredOrders.filter((o) => o.paymentMethod === 'transfer').reduce((s, o) => s + o.finalTotal, 0);

  // Low stock check
  const lowStockItems = products.filter((p) => p.currentStockKg <= p.minStockKg);

  let msg = `*📢 REKAP LAPORAN PENJUALAN HARIAN*\n`;
  msg += `*${settings.storeName.toUpperCase()}*\n`;
  msg += `📅 Tanggal: ${formatDateIndo(selectedDate)}\n`;
  msg += `⏱️ Waktu Cetak: ${new Date().toLocaleTimeString('id-ID')}\n`;
  msg += `------------------------------------\n`;
  msg += `*📊 RINGKASAN OMZET:*\n`;
  msg += `• Total Transaksi: *${filteredOrders.length} Nota*\n`;
  msg += `• Total Volume Terjual: *${totalKg.toFixed(2)} Kg*\n`;
  msg += `• Total Penjualan Bersih: *${formatRupiah(totalRevenue)}*\n`;
  if (totalDiscount > 0) {
    msg += `• Total Diskon Diberikan: ${formatRupiah(totalDiscount)}\n`;
  }
  msg += `------------------------------------\n`;
  msg += `*💳 METODE PEMBAYARAN:*\n`;
  msg += `• Tunai (Cash): ${formatRupiah(cashTotal)}\n`;
  msg += `• QRIS: ${formatRupiah(qrisTotal)}\n`;
  msg += `• Transfer Bank: ${formatRupiah(transferTotal)}\n`;
  msg += `------------------------------------\n`;
  msg += `*🐟 RINCIAN IKAN ASIN TERJUAL:*\n`;
  
  const sortedItems = Object.entries(itemMap).sort((a, b) => b[1].qty - a[1].qty);
  if (sortedItems.length === 0) {
    msg += `(Belum ada transaksi pada tanggal ini)\n`;
  } else {
    sortedItems.forEach(([name, data], idx) => {
      msg += `${idx + 1}. ${name}: *${data.qty.toFixed(2)} Kg* (${formatRupiah(data.total)})\n`;
    });
  }

  if (lowStockItems.length > 0) {
    msg += `------------------------------------\n`;
    msg += `*⚠️ PERINGATAN STOK MENIPIS (${lowStockItems.length} ITEM):*\n`;
    lowStockItems.forEach((p) => {
      msg += `• ${p.name}: Sisa *${p.currentStockKg} kg* (Batas: ${p.minStockKg} kg)\n`;
    });
  }

  msg += `------------------------------------\n`;
  msg += `_Laporan otomatis sistem AsinGo POS & Real-Time Stock_`;

  return msg;
}

export function openWhatsAppDailyRecap(
  orders: Order[],
  selectedDate: string,
  settings: StoreSettings,
  products: Product[]
) {
  const text = generateWhatsAppDailyRecapText(orders, selectedDate, settings, products);
  const cleanPhone = settings.ownerWaNumber.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function openWhatsAppCustomerReceipt(order: Order, settings: StoreSettings) {
  let msg = `*STRUK PEMBELIAN IKAN ASIN*\n`;
  msg += `*${settings.storeName.toUpperCase()}*\n`;
  msg += `${settings.address}\n`;
  msg += `Telp/WA: ${settings.phone}\n`;
  msg += `------------------------------------\n`;
  msg += `No. Nota : *${order.invoiceNumber}*\n`;
  msg += `Waktu    : ${formatDateTimeIndo(order.createdAt)}\n`;
  msg += `Kasir    : ${order.cashierName}\n`;
  msg += `Pelanggan: *${order.customerName}*\n`;
  msg += `------------------------------------\n`;
  msg += `*ITEM PESANAN:*\n`;

  order.items.forEach((item) => {
    msg += `• ${item.productName}\n`;
    msg += `  ${item.quantityKg} kg x ${formatRupiah(item.pricePerKg)} = *${formatRupiah(item.subtotal)}*\n`;
  });

  msg += `------------------------------------\n`;
  msg += `Subtotal : ${formatRupiah(order.subtotal)}\n`;
  if (order.discount > 0) {
    msg += `Diskon   : -${formatRupiah(order.discount)}\n`;
  }
  msg += `*TOTAL    : ${formatRupiah(order.finalTotal)}*\n`;
  msg += `Metode   : ${order.paymentMethod.toUpperCase()} (${order.paymentStatus === 'paid' ? 'LUNAS' : 'PENDING'})\n`;
  if (order.cashGiven) {
    msg += `Bayar    : ${formatRupiah(order.cashGiven)}\n`;
    msg += `Kembali  : ${formatRupiah(order.change || 0)}\n`;
  }
  msg += `------------------------------------\n`;
  msg += `${settings.footerReceiptMessage}\n`;
  msg += `_Terima kasih telah berbelanja di AsinGo!_`;

  const phone = order.customerPhone ? order.customerPhone.replace(/[^0-9]/g, '') : '';
  const cleanPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
  
  if (cleanPhone) {
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }
}

// EXPORT TO EXCEL (.xlsx)
export function exportOrdersToExcel(orders: Order[], filename: string, storeTitle: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Daftar Transaksi Detail
  const transactionsData = orders.map((o, idx) => ({
    'No': idx + 1,
    'No. Nota': o.invoiceNumber,
    'Tanggal & Jam': formatDateTimeIndo(o.createdAt),
    'Kasir': o.cashierName,
    'Nama Pelanggan': o.customerName,
    'No. Telepon': o.customerPhone || '-',
    'Rincian Item': o.items.map((it) => `${it.productName} (${it.quantityKg}kg)`).join('; '),
    'Total Berat (kg)': o.items.reduce((sum, it) => sum + it.quantityKg, 0),
    'Subtotal (Rp)': o.subtotal,
    'Diskon (Rp)': o.discount,
    'Total Bersih (Rp)': o.finalTotal,
    'Metode Bayar': o.paymentMethod.toUpperCase(),
    'Status': o.paymentStatus.toUpperCase(),
    'Catatan': o.notes || '',
  }));

  const wsTrans = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(wb, wsTrans, 'Daftar Penjualan');

  // Sheet 2: Ringkasan Item Terjual
  const itemMap: { [name: string]: { qty: number; revenue: number; count: number } } = {};
  orders.forEach((o) => {
    o.items.forEach((it) => {
      if (!itemMap[it.productName]) {
        itemMap[it.productName] = { qty: 0, revenue: 0, count: 0 };
      }
      itemMap[it.productName].qty += it.quantityKg;
      itemMap[it.productName].revenue += it.subtotal;
      itemMap[it.productName].count += 1;
    });
  });

  const summaryItemData = Object.entries(itemMap).map(([name, data], idx) => ({
    'No': idx + 1,
    'Nama Produk Ikan Asin': name,
    'Total Terjual (Kg)': Number(data.qty.toFixed(2)),
    'Total Omzet (Rp)': data.revenue,
    'Frekuensi Transaksi': data.count,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryItemData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekap per Produk');

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportInventoryToExcel(products: Product[], filename: string) {
  const wb = XLSX.utils.book_new();
  const data = products.map((p, idx) => ({
    'No': idx + 1,
    'Kode Produk': p.code,
    'Nama Ikan Asin': p.name,
    'Kategori': p.category,
    'Kualitas / Grade': p.qualityGrade || 'Super',
    'Asal / Asli': p.origin || 'Lokal',
    'Harga per Kg (Rp)': p.pricePerKg,
    'Stok Saat Ini (Kg)': p.currentStockKg,
    'Batas Min. Stok (Kg)': p.minStockKg,
    'Status Stok': p.currentStockKg <= p.minStockKg ? 'MENIPIS / RESTOCK' : 'AMAN',
    'Nilai Aset Stok (Rp)': p.pricePerKg * p.currentStockKg,
    'Status Jual': p.isAvailable ? 'Tersedia' : 'Nonaktif',
    'Terakhir Diperbarui': formatDateTimeIndo(p.updatedAt),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Stok Ikan Asin');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// EXPORT TO PDF
export function exportDailyReportToPDF(
  orders: Order[],
  selectedDate: string,
  settings: StoreSettings,
  products: Product[]
) {
  const doc = new jsPDF();
  const filteredOrders = orders.filter((o) => o.createdAt.startsWith(selectedDate));
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const totalKg = filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantityKg, 0), 0);

  // Header Title
  doc.setFontSize(18);
  doc.setTextColor(45, 75, 62); // Dark Sage
  doc.text(settings.storeName, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`${settings.address} | Telp: ${settings.phone}`, 14, 24);
  doc.text(`LAPORAN PENJUALAN HARIAN - ${formatDateIndo(selectedDate).toUpperCase()}`, 14, 30);

  doc.setDrawColor(45, 75, 62);
  doc.setLineWidth(0.8);
  doc.line(14, 33, 196, 33);

  // Metrics Box
  doc.setFontSize(10);
  doc.setTextColor(30, 46, 37);
  doc.text(`Total Transaksi: ${filteredOrders.length} Nota`, 14, 40);
  doc.text(`Total Volume Ikan: ${totalKg.toFixed(2)} Kg`, 80, 40);
  doc.text(`Total Omzet Bersih: ${formatRupiah(totalRevenue)}`, 140, 40);

  // Table
  const tableRows = filteredOrders.map((o, idx) => [
    idx + 1,
    o.invoiceNumber,
    new Date(o.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    o.customerName,
    o.items.map((it) => `${it.productName} (${it.quantityKg}kg)`).join('\n'),
    o.paymentMethod.toUpperCase(),
    formatRupiah(o.finalTotal),
  ]);

  autoTable(doc, {
    startY: 46,
    head: [['No', 'No. Nota', 'Jam', 'Pelanggan', 'Rincian Item', 'Metode', 'Total (Rp)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [45, 75, 62],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 28 },
      2: { halign: 'center', cellWidth: 16 },
      3: { cellWidth: 32 },
      4: { cellWidth: 58 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 28 },
    },
  });

  // Footer Signature
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(9);
  doc.text(`Dicetak pada: ${formatDateTimeIndo(new Date().toISOString())}`, 14, finalY);
  doc.text(`Mengetahui / Penanggung Jawab`, 140, finalY);
  doc.text(`( ......................................... )`, 140, finalY + 20);
  doc.text(`Owner / Manajer Toko`, 140, finalY + 25);

  doc.save(`Laporan_Harian_AsinGo_${selectedDate}.pdf`);
}

export function exportInventoryToPDF(products: Product[], settings: StoreSettings) {
  const doc = new jsPDF();
  const totalStockKg = products.reduce((sum, p) => sum + p.currentStockKg, 0);
  const totalAssetValue = products.reduce((sum, p) => sum + p.pricePerKg * p.currentStockKg, 0);

  doc.setFontSize(18);
  doc.setTextColor(45, 75, 62);
  doc.text(settings.storeName, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`LAPORAN STOK & INVENTARIS IKAN ASIN`, 14, 24);
  doc.text(`Per Tanggal: ${formatDateTimeIndo(new Date().toISOString())}`, 14, 30);

  doc.setDrawColor(45, 75, 62);
  doc.setLineWidth(0.8);
  doc.line(14, 33, 196, 33);

  doc.text(`Total Macam Produk: ${products.length} Jenis`, 14, 40);
  doc.text(`Total Stok Gudang: ${totalStockKg.toFixed(2)} Kg`, 80, 40);
  doc.text(`Total Estimasi Nilai Stok: ${formatRupiah(totalAssetValue)}`, 140, 40);

  const rows = products.map((p, idx) => [
    idx + 1,
    p.code,
    p.name,
    p.category,
    formatRupiah(p.pricePerKg),
    `${p.currentStockKg} kg`,
    `${p.minStockKg} kg`,
    p.currentStockKg <= p.minStockKg ? 'PERLU RESTOCK' : 'Aman',
  ]);

  autoTable(doc, {
    startY: 46,
    head: [['No', 'Kode', 'Nama Ikan Asin', 'Kategori', 'Harga/Kg', 'Stok', 'Min', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [45, 75, 62],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 50 },
      3: { cellWidth: 30 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 15 },
      7: { halign: 'center', cellWidth: 24 },
    },
  });

  doc.save(`Laporan_Stok_AsinGo_${new Date().toISOString().split('T')[0]}.pdf`);
}
