import React, { useState } from 'react';
import { Order, StoreSettings, Product } from '../types';
import {
  formatRupiah,
  formatWeight,
  formatDateIndo,
  openWhatsAppDailyRecap,
  exportDailyReportToPDF,
  exportOrdersToExcel,
  generateWhatsAppDailyRecapText,
} from '../lib/exportUtils';
import {
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Calendar,
  DollarSign,
  ShoppingBag,
  Banknote,
  QrCode,
  Eye,
  Copy,
  Check,
} from 'lucide-react';

interface DailyReportViewProps {
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
  onUpdateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  onViewReceipt: (order: Order) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  orders,
  products,
  settings,
  onUpdateSettings,
  onViewReceipt,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [ownerWaInput, setOwnerWaInput] = useState<string>(settings.ownerWaNumber);
  const [isEditingWa, setIsEditingWa] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Filter orders by selected day - ONLY paid & confirmed by Kasir
  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
  const pendingOrders = orders.filter((o) => o.paymentStatus === 'pending');
  const filteredOrders = paidOrders.filter((o) => o.createdAt.startsWith(selectedDate));

  // Calculations
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const totalKg = filteredOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.quantityKg, 0),
    0
  );

  const cashOrders = filteredOrders.filter((o) => o.paymentMethod === 'cash');
  const qrisOrders = filteredOrders.filter((o) => o.paymentMethod === 'qris');
  const transferOrders = filteredOrders.filter((o) => o.paymentMethod === 'transfer');
  const ewalletOrders = filteredOrders.filter((o) => o.paymentMethod === 'ewallet');

  const cashTotal = cashOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const qrisTotal = qrisOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const transferTotal = transferOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const ewalletTotal = ewalletOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const nonCashTotal = qrisTotal + transferTotal + ewalletTotal;

  // Product sales breakdown
  const itemMap: { [name: string]: { qty: number; total: number; count: number } } = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((it) => {
      if (!itemMap[it.productName]) {
        itemMap[it.productName] = { qty: 0, total: 0, count: 0 };
      }
      itemMap[it.productName].qty += it.quantityKg;
      itemMap[it.productName].total += it.subtotal;
      itemMap[it.productName].count += 1;
    });
  });

  const sortedItems = Object.entries(itemMap).sort((a, b) => b[1].qty - a[1].qty);

  const handleSaveWaNumber = async () => {
    await onUpdateSettings({ ownerWaNumber: ownerWaInput });
    setIsEditingWa(false);
  };

  const handleCopyText = () => {
    const text = generateWhatsAppDailyRecapText(orders, selectedDate, settings, products);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Date Picker Bar - Clean Flat */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1b2e25] text-white flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-[#1B2E25]">Laporan Penjualan Harian &amp; WhatsApp</h2>
            <p className="text-xs text-gray-500">
              Integrasi kirim rekap otomatis ke nomor WhatsApp Admin / Pemilik Toko
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-[#2D4B3E]" /> Pilih Tanggal:
          </label>
          <input
            id="report-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-[#F8FAF9] border border-gray-300 rounded-xl text-[#1B2E25] focus:outline-none focus:border-[#2D4B3E]"
          />
        </div>
      </div>

      {/* WhatsApp Integration Quick Box - Flat & Clean with Bold Buttons */}
      <div className="bg-[#1b2e25] text-white p-5 rounded-2xl border border-[#2d4b3e] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-300" />
            <span className="font-bold text-base tracking-wide">Kirim Rekap Hari Ini ke WhatsApp Admin</span>
          </div>
          <p className="text-xs text-gray-300 max-w-2xl">
            Sistem merangkum total omzet, rincian pembayaran, volume ikan per jenis, dan daftar stok menipis secara rapi ke format pesan WhatsApp.
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-gray-300 font-medium">Tujuan No. WA:</span>
            {isEditingWa ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={ownerWaInput}
                  onChange={(e) => setOwnerWaInput(e.target.value)}
                  placeholder="6281234567890"
                  className="px-2 py-0.5 text-xs font-mono font-bold bg-white text-gray-900 rounded border focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveWaNumber}
                  className="btn-timbul-primary px-2.5 py-0.5 rounded text-[11px]"
                >
                  Simpan
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-emerald-300">{settings.ownerWaNumber}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingWa(true)}
                  className="text-[11px] underline text-gray-300 hover:text-white"
                >
                  (Ubah Nomor)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Buttons with Bold Tactile Depth */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            id="copy-recap-text-btn"
            type="button"
            onClick={handleCopyText}
            className="btn-timbul-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5"
          >
            {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-700" />}
            {copiedText ? 'Tersalin!' : 'Salin Teks Rekap'}
          </button>

          <button
            id="send-wa-daily-btn"
            type="button"
            onClick={() => openWhatsAppDailyRecap(orders, selectedDate, settings, products)}
            className="btn-timbul-wa px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Buka WhatsApp &amp; Kirim Sekarang
          </button>
        </div>
      </div>

      {/* Metrics Cards - Clean Flat Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Omzet Bersih</span>
            <DollarSign className="w-4 h-4 text-[#2D4B3E]" />
          </div>
          <span className="font-black text-2xl text-[#1B2E25] block mt-2">
            {formatRupiah(totalRevenue)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {filteredOrders.length} Transaksi Nota
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Ikan Terjual</span>
            <ShoppingBag className="w-4 h-4 text-[#2D4B3E]" />
          </div>
          <span className="font-black text-2xl text-[#1B2E25] block mt-2">
            {formatWeight(totalKg)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Dari {sortedItems.length} Macam Ikan Asin
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Pembayaran Tunai</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-black text-2xl text-gray-900 block mt-2">
            {formatRupiah(cashTotal)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {cashOrders.length} Pembayaran Tunai
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Non-Tunai (QRIS/Bank/E-Wallet)</span>
            <QrCode className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-black text-2xl text-gray-900 block mt-2">
            {formatRupiah(nonCashTotal)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            QRIS: {formatRupiah(qrisTotal)} • Trf: {formatRupiah(transferTotal)} • E-Wallet: {formatRupiah(ewalletTotal)}
          </span>
        </div>
      </div>

      {pendingOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span className="font-semibold">Info Kasir: Terdapat {pendingOrders.length} pesanan web pelanggan yang masih menunggu pembayaran & konfirmasi di Kasir.</span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Hanya pesanan berstatus Lunas yang dimasukkan ke dalam omzet resmi penjualan.</span>
        </div>
      )}

      {/* Main Breakdown: Table of Orders & Product Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Order Transactions Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#FAFAF8]">
            <h3 className="font-bold text-sm text-[#1B2E25]">
              Daftar Nota Transaksi ({formatDateIndo(selectedDate)})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportOrdersToExcel(filteredOrders, `Penjualan_Harian_${selectedDate}`, settings.storeName)
                }
                className="btn-timbul-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Excel
              </button>
              <button
                type="button"
                onClick={() => exportDailyReportToPDF(orders, selectedDate, settings, products)}
                className="btn-timbul-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-rose-700" />
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-40 text-gray-400" />
                <p className="font-bold text-xs text-gray-600">Belum ada transaksi pada tanggal ini</p>
                <p className="text-[11px] text-gray-400">Silakan pilih tanggal lain pada kalender di atas</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-[#1B2E25] font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3 pl-4">No. Nota &amp; Jam</th>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">Item Pesanan</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 pr-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F9FAF9]">
                      <td className="p-3 pl-4">
                        <span className="font-mono font-bold text-[#1B2E25] block">{order.invoiceNumber}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-gray-900 block">{order.customerName}</span>
                        <span className="text-[10px] text-gray-500">Kasir: {order.cashierName}</span>
                      </td>
                      <td className="p-3 max-w-[200px]">
                        <p className="line-clamp-2 text-gray-700 font-medium">
                          {order.items.map((it) => `${it.productName} (${it.quantityKg}kg)`).join(', ')}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-sm text-[#1B2E25]">
                        {formatRupiah(order.finalTotal)}
                      </td>
                      <td className="p-3 pr-4 text-center">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(order)}
                          title="Lihat Struk"
                          className="btn-timbul-white p-1.5 rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-700" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right (4 cols): Summary by Fish Products */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-sm text-[#1B2E25] border-b border-gray-200 pb-2">
            Rincian Ikan Asin Terjual Hari Ini
          </h3>

          {sortedItems.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Tidak ada produk terjual</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y divide-gray-100">
              {sortedItems.map(([name, data], idx) => (
                <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900 block">{name}</span>
                    <span className="text-[11px] text-gray-500">{data.count} kali transaksi</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-xs text-[#1B2E25] block">
                      {formatWeight(data.qty)}
                    </span>
                    <span className="text-[10px] text-gray-600 font-semibold">{formatRupiah(data.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
