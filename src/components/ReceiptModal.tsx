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

        {/* Receipt Printable Area - Authentic 58mm/80mm Minimarket Format */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#F0F2F1] flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[340px] bg-white px-4 py-5 border border-dashed border-gray-300 shadow-sm font-mono text-[11px] leading-tight text-gray-900 space-y-2.5 selection:bg-gray-200"
          >
            {/* Store Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-2.5 flex flex-col items-center">
              <div className="w-12 h-12 mb-1 p-1 bg-white rounded-md flex items-center justify-center overflow-hidden">
                <img
                  src={settings.logoUrl || '/logo.png'}
                  alt={settings.storeName}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src.includes('logo.png')) {
                      img.src = '/logo-default.png';
                    } else if (img.src.includes('logo-default.png')) {
                      img.src = '/logo.svg';
                    } else {
                      img.style.display = 'none';
                    }
                  }}
                />
              </div>
              <h2 className="font-black text-sm text-black tracking-widest uppercase">{settings.storeName}</h2>
              <p className="text-[10px] text-gray-700">{settings.tagline}</p>
              <p className="text-[9.5px] text-gray-600 mt-0.5">{settings.address}</p>
              <p className="text-[9.5px] text-gray-600">Telp/WA: {settings.phone}</p>
            </div>

            {/* Meta Transaction */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-gray-300 pb-2">
              <div className="flex justify-between">
                <span>NO. NOTA</span>
                <span className="font-bold">{order.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>TANGGAL</span>
                <span>{formatDateTimeIndo(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>KASIR</span>
                <span className="uppercase">{order.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>PELANGGAN</span>
                <span className="font-semibold truncate max-w-[170px] text-right">
                  {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="text-gray-400 text-center text-[10px] tracking-widest select-none -my-1">
              ================================
            </div>

            {/* Items Purchased */}
            <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-2.5 text-[10.5px]">
              {order.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold text-black">{item.productName}</div>
                  <div className="flex justify-between text-gray-700 pl-1">
                    <span>
                      {item.quantityKg} kg × {formatRupiah(item.pricePerKg)}
                    </span>
                    <span className="font-bold text-black">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Payments */}
            <div className="space-y-1 text-[10.5px] border-b border-dashed border-gray-300 pb-2">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>DISKON</span>
                  <span>-{formatRupiah(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs text-black pt-1 border-t border-dashed border-gray-300">
                <span>TOTAL HARGA</span>
                <span>{formatRupiah(order.finalTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-700 pt-0.5">
                <span>METODE</span>
                <span className="uppercase font-bold text-black">
                  {order.paymentChannel ? `${order.paymentChannel} (${order.paymentMethod.toUpperCase()})` : order.paymentMethod.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>STATUS</span>
                <span className="font-bold text-emerald-700 uppercase">LUNAS</span>
              </div>
              {order.cashGiven !== undefined && order.cashGiven > 0 && (
                <>
                  <div className="flex justify-between text-gray-700 pt-0.5">
                    <span>TUNAI DITERIMA</span>
                    <span>{formatRupiah(order.cashGiven)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-black">
                    <span>KEMBALIAN</span>
                    <span>{formatRupiah(order.change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Retail Receipt Footer Notice */}
            <div className="text-center pt-1.5 text-[9.5px] text-gray-600 space-y-1">
              <p className="leading-tight">{settings.footerReceiptMessage}</p>
              <div className="text-gray-400 text-center tracking-widest select-none">
                --------------------------------
              </div>
              <p className="font-bold text-black tracking-wide uppercase">
                *** TERIMA KASIH ATAS KUNJUNGAN ANDA ***
              </p>
              <p className="text-[8.5px] text-gray-500">
                Layanan Pelanggan WA: {settings.phone}
              </p>
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
