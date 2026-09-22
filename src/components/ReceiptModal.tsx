import React from 'react';
import { Order, StoreSettings } from '../types';
import { formatRupiah, formatDateTimeIndo, openWhatsAppCustomerReceipt } from '../lib/exportUtils';
import { X, Printer, MessageCircle, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    openWhatsAppCustomerReceipt(order, settings);
  };

  return (
    <div id="receipt-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base leading-tight">Transaksi Berhasil Disimpan</h3>
              <p className="text-xs text-gray-300">Struk Pembayaran #{order.invoiceNumber}</p>
            </div>
          </div>
          <button
            id="close-receipt-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Printable Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#FAFAF8]">
          <div
            id="printable-receipt"
            className="bg-white p-5 border border-dashed border-gray-300 rounded-xl shadow-xs font-mono text-xs text-gray-800 space-y-3"
          >
            {/* Store Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-3 flex flex-col items-center">
              <div className="w-10 h-10 mb-1.5 p-1 bg-white rounded-lg border border-[#2D4B3E]/30 flex items-center justify-center">
                <img
                  src={settings.logoUrl || '/logo.svg'}
                  alt={settings.storeName}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.svg';
                  }}
                />
              </div>
              <h2 className="font-bold text-base text-[#1b2e25] tracking-wider uppercase">{settings.storeName}</h2>
              <p className="text-[11px] text-gray-600">{settings.tagline}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{settings.address}</p>
              <p className="text-[10px] text-gray-500">Telp/WA: {settings.phone}</p>
            </div>

            {/* Meta */}
            <div className="text-[11px] space-y-0.5 border-b border-dashed border-gray-300 pb-2">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold">{order.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDateTimeIndo(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{order.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-semibold">{order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-2.5">
              {order.items.map((item, idx) => (
                <div key={idx}>
                  <div className="font-bold text-[11px] text-gray-900">{item.productName}</div>
                  <div className="flex justify-between text-gray-600 pl-2">
                    <span>{item.quantityKg} kg × {formatRupiah(item.pricePerKg)}</span>
                    <span className="font-semibold text-gray-900">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] pt-1 border-b border-dashed border-gray-300 pb-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-[#1b2e25] pt-1">
                <span>TOTAL:</span>
                <span>{formatRupiah(order.finalTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 pt-0.5">
                <span>Metode Bayar:</span>
                <span className="uppercase font-semibold">{order.paymentMethod} (LUNAS)</span>
              </div>
              {order.cashGiven !== undefined && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Uang Diterima:</span>
                    <span>{formatRupiah(order.cashGiven)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Kembali:</span>
                    <span className="font-bold">{formatRupiah(order.change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Notice */}
            <div className="text-center pt-2 text-[10px] text-gray-500 space-y-0.5">
              <p>{settings.footerReceiptMessage}</p>
              <p className="font-bold text-[#1b2e25]">Terima Kasih Atas Kunjungan Anda!</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white p-4 border-t border-gray-200 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              id="print-thermal-receipt-btn"
              type="button"
              onClick={handlePrint}
              className="btn-timbul-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak Struk
            </button>
            <button
              id="send-wa-receipt-btn"
              type="button"
              onClick={handleSendWhatsApp}
              className="btn-timbul-wa py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              Kirim ke WhatsApp
            </button>
          </div>
          <button
            id="finish-receipt-btn"
            type="button"
            onClick={onClose}
            className="w-full btn-timbul-primary py-2.5 rounded-xl font-bold text-sm"
          >
            Selesai / Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
};
