import React, { useState } from 'react';
import { Order, StoreSettings } from '../types';
import { formatRupiah, formatWeight, formatDateTimeIndo } from '../lib/exportUtils';
import {
  X,
  CheckCircle,
  Clock,
  Copy,
  Check,
  MessageCircle,
  Printer,
  ShieldCheck,
  QrCode,
  CreditCard,
  Smartphone,
  Banknote,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface CustomerOrderStatusModalProps {
  order: Order | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerOrderStatusModal: React.FC<CustomerOrderStatusModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const isPaid = order.paymentStatus === 'paid';
  const isPending = order.paymentStatus === 'pending';

  const handleSendWaProof = () => {
    let phone = settings.ownerWaNumber || '62895351121278';
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    } else if (!phone.startsWith('62')) {
      phone = '62' + phone;
    }

    const itemsSummary = order.items
      .map((it) => `- ${it.productName} (${formatWeight(it.quantityKg)}): ${formatRupiah(it.subtotal)}`)
      .join('%0A');

    const text = `Halo Kasir ${settings.storeName}, saya telah memesan via Web:%0A%0A` +
      `🧾 *Invoice:* #${order.invoiceNumber}%0A` +
      `👤 *Nama:* ${order.customerName}%0A` +
      `📱 *No. HP:* ${order.customerPhone}%0A` +
      `🐟 *Pesanan:*%0A${itemsSummary}%0A%0A` +
      `💰 *Total:* ${formatRupiah(order.finalTotal)}%0A` +
      `💳 *Metode:* ${order.paymentChannel || order.paymentMethod.toUpperCase()}%0A%0A` +
      `Mohon dikonfirmasi pesanannya di kasir. Terima kasih!`;

    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const bankList = settings.bankAccounts || [
    { bankName: 'BCA', accountNumber: '883-0512-990', accountHolder: 'AsinGo Official' },
    { bankName: 'Mandiri', accountNumber: '142-00-1928374-1', accountHolder: 'AsinGo Official' },
    { bankName: 'BRI', accountNumber: '0123-01-084729-50-8', accountHolder: 'AsinGo Official' },
    { bankName: 'BNI', accountNumber: '089-234-1189', accountHolder: 'AsinGo Official' },
  ];

  const ewalletList = settings.eWallets || [
    { walletName: 'DANA', phoneNumber: '0895-3511-21278', accountHolder: 'AsinGo Official' },
    { walletName: 'GoPay', phoneNumber: '0895-3511-21278', accountHolder: 'AsinGo Official' },
    { walletName: 'OVO', phoneNumber: '0895-3511-21278', accountHolder: 'AsinGo Official' },
    { walletName: 'ShopeePay', phoneNumber: '0895-3511-21278', accountHolder: 'AsinGo Official' },
  ];

  return (
    <div
      id="customer-order-status-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2d4b3e] flex items-center justify-center text-white">
              {isPaid ? (
                <CheckCircle className="w-5 h-5 text-emerald-300" />
              ) : (
                <Clock className="w-5 h-5 text-amber-300 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isPaid ? 'Pembayaran Berhasil & Lunas!' : 'Pesanan Masuk ke Web Kasir'}
              </h3>
              <p className="text-xs text-gray-300">Invoice #{order.invoiceNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAFAF8]">
          {/* Status Alert Banner */}
          {isPaid ? (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-4 rounded-xl space-y-1 shadow-xs">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>PESANAN TELAH DIKONFIRMASI LUNAS OLEH KASIR!</span>
              </div>
              <p className="text-xs text-emerald-800">
                Terima kasih! Pembayaran Anda telah disahkan oleh <b>{order.confirmedBy || 'Kasir Toko AsinGo'}</b>. Pesanan ikan asin Anda siap dipacking dan dikirim / diambil.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 text-amber-950 p-4 rounded-xl space-y-1 shadow-xs">
              <div className="flex items-center gap-2 font-black text-sm text-amber-800">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                <span>STATUS: MENUNGGU PEMBAYARAN & KONFIRMASI KASIR</span>
              </div>
              <p className="text-xs text-amber-800">
                Pesanan Anda telah diteruskan langsung ke layar kasir toko secara real-time. Silakan selesaikan pembayaran Anda di bawah ini agar pesanan dapat disahkan.
              </p>
            </div>
          )}

          {/* Payment Instructions according to selected channel */}
          {!isPaid && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#2D4B3E]" /> Panduan Pembayaran ({order.paymentChannel || order.paymentMethod.toUpperCase()})
                </span>
                <span className="text-xs font-black text-[#234334]">
                  {formatRupiah(order.finalTotal)}
                </span>
              </div>

              {/* 1. If Transfer Bank */}
              {order.paymentMethod === 'transfer' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-gray-600">
                    Silakan transfer tepat sejumlah <b className="text-gray-900">{formatRupiah(order.finalTotal)}</b> ke salah satu rekening resmi toko kami:
                  </p>
                  <div className="space-y-2">
                    {bankList.map((b) => (
                      <div
                        key={b.bankName}
                        className="p-3 bg-[#F8FAF9] border border-gray-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900">{b.bankName}</span>
                            <span className="text-[10px] text-gray-500">a/n {b.accountHolder}</span>
                          </div>
                          <div className="font-mono font-bold text-[#1B2E25] text-sm mt-0.5">
                            {b.accountNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(b.accountNumber, b.bankName)}
                          className="btn-timbul-white px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          {copiedText === b.bankName ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedText === b.bankName ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. If E-Wallet */}
              {order.paymentMethod === 'ewallet' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-gray-600">
                    Transfer saldo e-wallet sejumlah <b className="text-gray-900">{formatRupiah(order.finalTotal)}</b> ke dompet digital resmi AsinGo:
                  </p>
                  <div className="space-y-2">
                    {ewalletList.map((w) => (
                      <div
                        key={w.walletName}
                        className="p-3 bg-[#F8FAF9] border border-gray-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900">{w.walletName}</span>
                            <span className="text-[10px] text-gray-500">a/n {w.accountHolder}</span>
                          </div>
                          <div className="font-mono font-bold text-[#1B2E25] text-sm mt-0.5">
                            {w.phoneNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(w.phoneNumber, w.walletName)}
                          className="btn-timbul-white px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          {copiedText === w.walletName ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedText === w.walletName ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. If QRIS */}
              {order.paymentMethod === 'qris' && (
                <div className="text-center space-y-2.5 py-1">
                  <div className="inline-block p-3 bg-white border border-gray-300 rounded-2xl shadow-xs">
                    <QrCode className="w-32 h-32 mx-auto text-[#1B2E25]" />
                  </div>
                  <div>
                    <p className="font-black text-xs text-[#1B2E25]">QRIS Nasional AsinGo Official</p>
                    <p className="text-[11px] text-gray-500">Bisa di-scan dari BCA, Mandiri, BRI, DANA, GoPay, OVO, ShopeePay</p>
                  </div>
                </div>
              )}

              {/* 4. If Tunai / COD */}
              {order.paymentMethod === 'cash' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-amber-700" />
                    <span>Pembayaran Tunai Langsung / COD</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Siapkan uang pas sejumlah <b>{formatRupiah(order.finalTotal)}</b> untuk diserahkan ke kasir saat mengambil pesanan di toko atau kurir pengiriman saat pesanan tiba.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Items Summary Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2.5 text-xs">
            <span className="font-bold text-gray-700 uppercase tracking-wider text-[11px] block">
              Ringkasan Ikan Asin Dipesan:
            </span>
            <div className="divide-y divide-gray-100">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-2 first:pt-0 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-900">{it.productName}</span>
                    <div className="text-[11px] text-gray-500">
                      {formatWeight(it.quantityKg)} × {formatRupiah(it.pricePerKg)}
                    </div>
                  </div>
                  <span className="font-bold text-[#1B2E25]">{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline font-black">
              <span>Total Tagihan:</span>
              <span className="text-base text-[#234334]">{formatRupiah(order.finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 space-y-2 shrink-0">
          {/* Send WA Confirmation */}
          <button
            id="send-wa-proof-btn"
            type="button"
            onClick={handleSendWaProof}
            className="w-full btn-timbul-wa py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-white" />
            <span>Kirim Rincian & Bukti ke WhatsApp Kasir</span>
          </button>

          {isPaid && (
            <button
              type="button"
              onClick={handlePrint}
              className="w-full btn-timbul-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-gray-700"
            >
              <Printer className="w-4 h-4 text-[#2D4B3E]" />
              <span>Cetak / Simpan Nota Pembeli</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 text-center"
          >
            Tutup Jendela Status
          </button>
        </div>
      </div>
    </div>
  );
};
