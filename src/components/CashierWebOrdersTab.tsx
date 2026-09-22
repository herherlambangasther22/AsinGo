import React, { useState } from 'react';
import { Order, StoreSettings } from '../types';
import { formatRupiah, formatWeight, formatDateTimeIndo } from '../lib/exportUtils';
import {
  Clock,
  CheckCircle,
  XCircle,
  Search,
  MessageCircle,
  Printer,
  Banknote,
  MapPin,
  User,
  ShoppingBag,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  QrCode,
  Smartphone,
} from 'lucide-react';

interface CashierWebOrdersTabProps {
  orders: Order[];
  settings: StoreSettings;
  onOpenPaymentModal: (order: Order) => void;
  onViewReceipt: (order: Order) => void;
  onCancelOrder: (orderId: string, reason?: string) => Promise<boolean>;
}

export const CashierWebOrdersTab: React.FC<CashierWebOrdersTabProps> = ({
  orders,
  settings,
  onOpenPaymentModal,
  onViewReceipt,
  onCancelOrder,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter only web customer orders
  const webOrders = orders.filter((o) => o.orderSource === 'web_pelanggan');

  const pendingCount = webOrders.filter((o) => o.paymentStatus === 'pending').length;
  const paidCount = webOrders.filter((o) => o.paymentStatus === 'paid').length;
  const cancelledCount = webOrders.filter((o) => o.paymentStatus === 'cancelled').length;

  const filteredOrders = webOrders.filter((o) => {
    const matchesStatus = filterStatus === 'all' || o.paymentStatus === filterStatus;
    const matchesSearch =
      o.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerPhone && o.customerPhone.includes(searchQuery)) ||
      (o.customerAddress && o.customerAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.items.some((it) => it.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const handleOpenWhatsAppChat = (order: Order) => {
    if (!order.customerPhone) return;
    let cleanPhone = order.customerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }

    const itemsText = order.items
      .map((it) => `- ${it.productName} (${formatWeight(it.quantityKg)}): ${formatRupiah(it.subtotal)}`)
      .join('%0A');

    const msg = `Halo ${order.customerName}, salam dari Kasir ${settings.storeName}!%0A%0A` +
      `Kami telah menerima pesanan online Anda:%0A` +
      `📌 *No. Invoice:* ${order.invoiceNumber}%0A` +
      `🐟 *Rincian Ikan Asin:*%0A${itemsText}%0A%0A` +
      `💰 *Total Pembayaran:* ${formatRupiah(order.finalTotal)}%0A` +
      `💳 *Metode:* ${order.paymentChannel || order.paymentMethod.toUpperCase()}%0A%0A` +
      `Status saat ini: *${order.paymentStatus === 'paid' ? 'LUNAS (Siap Dikirim / Diambil)' : 'MENUNGGU KONFIRMASI KASIR'}*.%0A%0A` +
      `Silakan konfirmasi jika sudah melakukan pembayaran atau ada catatan tambahan. Terima kasih!`;

    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleCancel = async (order: Order) => {
    const reason = prompt(
      `Alasan pembatalan pesanan #${order.invoiceNumber} (${order.customerName}):`,
      'Pembeli membatalkan pesanan'
    );
    if (reason !== null) {
      await onCancelOrder(order.id, reason);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info & Real-Time Alert Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-[#1B2E25]">Orderan Masuk dari Web Pelanggan</h2>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse shadow-xs">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {pendingCount} Menunggu Kasir
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Semua pesanan web pelanggan masuk ke kasir untuk verifikasi pembayaran (Transfer, QRIS, E-Wallet, atau Tunai COD) sebelum stok resmi dipotong.
          </p>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px] sm:min-w-[280px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, invoice, no WA..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFilterStatus('pending')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            filterStatus === 'pending'
              ? 'btn-timbul-primary'
              : 'btn-timbul-white text-gray-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Menunggu Kasir</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('paid')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            filterStatus === 'paid'
              ? 'btn-timbul-primary'
              : 'btn-timbul-white text-gray-700'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lunas Dikonfirmasi</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {paidCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            filterStatus === 'all'
              ? 'btn-timbul-primary'
              : 'btn-timbul-white text-gray-700'
          }`}
        >
          <span>Semua Pesanan Web</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {webOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('cancelled')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            filterStatus === 'cancelled'
              ? 'btn-timbul-primary'
              : 'btn-timbul-white text-gray-700'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Dibatalkan</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {cancelledCount}
          </span>
        </button>
      </div>

      {/* Orders List Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400 space-y-2">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 opacity-40" />
          <h3 className="font-bold text-sm text-gray-700">Tidak ada pesanan web</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {filterStatus === 'pending'
              ? 'Semua pesanan web pelanggan telah diproses oleh kasir.'
              : 'Belum ada pesanan dengan kriteria pencarian ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const isPending = order.paymentStatus === 'pending';
            const isPaid = order.paymentStatus === 'paid';
            const isCancelled = order.paymentStatus === 'cancelled';

            const totalKg = order.items.reduce((s, it) => s + it.quantityKg, 0);

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-200/50 hover:border-amber-400'
                    : isPaid
                    ? 'border-gray-200 hover:border-[#2D4B3E]'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                {/* Order Top Ribbon */}
                <div
                  className={`px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
                    isPending
                      ? 'bg-amber-50/70 border-amber-200'
                      : isPaid
                      ? 'bg-[#F4F9F6] border-emerald-100'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-[#1B2E25] text-sm">
                      #{order.invoiceNumber}
                    </span>
                    <span className="text-gray-500 font-medium">
                      {formatDateTimeIndo(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs">
                        <Clock className="w-3.5 h-3.5" />
                        Menunggu Pembayaran Kasir
                      </span>
                    )}

                    {isPaid && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Lunas Dikonfirmasi
                      </span>
                    )}

                    {isCancelled && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs">
                        <XCircle className="w-3.5 h-3.5" />
                        Dibatalkan
                      </span>
                    )}
                  </div>
                </div>

                {/* Order Content Info */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Customer Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#F8FAF9] p-3.5 rounded-xl border border-gray-200 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px] font-medium">
                        Nama Pemesan / Warung:
                      </span>
                      <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5 mt-0.5">
                        <User className="w-4 h-4 text-[#2D4B3E]" />
                        {order.customerName}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px] font-medium">
                        Kontak WhatsApp / HP:
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-gray-900">
                          {order.customerPhone || '-'}
                        </span>
                        {order.customerPhone && (
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppChat(order)}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 underline"
                          >
                            <MessageCircle className="w-3 h-3" /> Chat WA
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px] font-medium">
                        Metode Pembayaran Pilihan:
                      </span>
                      <span className="font-bold text-gray-900 mt-0.5 flex items-center gap-1">
                        {order.paymentMethod === 'qris' && <QrCode className="w-3.5 h-3.5 text-blue-600" />}
                        {order.paymentMethod === 'transfer' && <CreditCard className="w-3.5 h-3.5 text-purple-600" />}
                        {order.paymentMethod === 'ewallet' && <Smartphone className="w-3.5 h-3.5 text-emerald-600" />}
                        {order.paymentMethod === 'cash' && <Banknote className="w-3.5 h-3.5 text-amber-600" />}
                        {order.paymentChannel || order.paymentMethod.toUpperCase()}
                      </span>
                    </div>

                    {order.customerAddress && (
                      <div className="md:col-span-3 pt-2 border-t border-gray-200 flex items-start gap-1.5 text-gray-700">
                        <MapPin className="w-4 h-4 text-[#2D4B3E] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">Alamat Pengiriman: </span>
                          <span className="font-semibold">{order.customerAddress}</span>
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <div className="md:col-span-3 pt-1 text-gray-600 italic">
                        Catatan: "{order.notes}"
                      </div>
                    )}
                  </div>

                  {/* Order Items Table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-3.5 py-2 text-[11px] font-bold text-gray-600 border-b flex justify-between">
                      <span>Daftar Ikan Asin ({order.items.length} Macam • {formatWeight(totalKg)})</span>
                      <span>Subtotal</span>
                    </div>

                    <div className="divide-y divide-gray-100 bg-white">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-gray-900">{it.productName}</span>
                            <div className="text-[11px] text-gray-500 font-medium">
                              {formatWeight(it.quantityKg)} × {formatRupiah(it.pricePerKg)}/kg
                            </div>
                          </div>
                          <span className="font-bold text-[#1B2E25]">
                            {formatRupiah(it.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total Row */}
                    <div className="bg-[#F8FAF9] px-4 py-3 border-t border-gray-200 flex justify-between items-baseline font-black">
                      <span className="text-xs text-gray-700">TOTAL TAGIHAN KASIR:</span>
                      <span className="text-lg text-[#234334]">
                        {formatRupiah(order.finalTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Confirmation Info if already paid */}
                  {isPaid && (
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-900">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>
                          Telah disahkan oleh Kasir: <b>{order.confirmedBy || 'Kasir AsinGo'}</b>
                          {order.confirmedAt && ` (${formatDateTimeIndo(order.confirmedAt)})`}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold">
                        Kanal: {order.paymentChannel || order.paymentMethod.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Order Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                    {/* Chat via WhatsApp */}
                    {order.customerPhone && (
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppChat(order)}
                        className="btn-timbul-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 text-gray-700 hover:text-emerald-700"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Chat WhatsApp Pembeli</span>
                      </button>
                    )}

                    {/* Print Receipt Button (if paid) */}
                    {isPaid && (
                      <button
                        type="button"
                        onClick={() => onViewReceipt(order)}
                        className="btn-timbul-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 text-gray-800"
                      >
                        <Printer className="w-4 h-4 text-[#2D4B3E]" />
                        <span>Lihat / Cetak Struk Kasir</span>
                      </button>
                    )}

                    {/* Cancel order button (if pending) */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleCancel(order)}
                        className="btn-timbul-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Batalkan Pesanan</span>
                      </button>
                    )}

                    {/* PROSES & KONFIRMASI PEMBAYARAN KASIR (PRIMARY ACTION) */}
                    {isPending && (
                      <button
                        id={`confirm-order-btn-${order.id}`}
                        type="button"
                        onClick={() => onOpenPaymentModal(order)}
                        className="btn-timbul-primary px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 tracking-wide"
                      >
                        <Banknote className="w-4 h-4 text-emerald-300" />
                        <span>PROSES & KONFIRMASI PEMBAYARAN KASIR</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
