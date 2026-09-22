import React, { useState, useEffect } from 'react';
import { Order, PaymentMethod, StoreSettings } from '../types';
import { formatRupiah, formatWeight } from '../lib/exportUtils';
import {
  X,
  CheckCircle,
  Banknote,
  QrCode,
  CreditCard,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  Clock,
  User,
  ShoppingBag,
} from 'lucide-react';
import { playSuccessSound } from '../lib/audioSound';
import confetti from 'canvas-confetti';

interface CashierPaymentModalProps {
  order: Order | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    orderId: string,
    paymentData: {
      paymentMethod: PaymentMethod;
      paymentChannel: string;
      cashGiven?: number;
      change?: number;
    }
  ) => Promise<void>;
}

export const CashierPaymentModal: React.FC<CashierPaymentModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !order) return null;

  const [method, setMethod] = useState<PaymentMethod>(order.paymentMethod || 'cash');
  const [channel, setChannel] = useState<string>(
    order.paymentChannel || (order.paymentMethod === 'transfer' ? 'BCA' : order.paymentMethod === 'ewallet' ? 'DANA' : 'Tunai Kasir / COD')
  );
  const [cashGiven, setCashGiven] = useState<number>(order.finalTotal);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync initial state when modal opens
  useEffect(() => {
    if (order) {
      setMethod(order.paymentMethod || 'cash');
      setChannel(
        order.paymentChannel ||
          (order.paymentMethod === 'transfer'
            ? 'BCA'
            : order.paymentMethod === 'ewallet'
            ? 'DANA'
            : order.paymentMethod === 'qris'
            ? 'QRIS Toko'
            : 'Tunai Kasir / COD')
      );
      setCashGiven(order.finalTotal);
    }
  }, [order]);

  const change = Math.max(0, cashGiven - order.finalTotal);
  const isCashInsufficient = method === 'cash' && cashGiven < order.finalTotal;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(label);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handleSetQuickCash = (val: number) => {
    setCashGiven(val);
  };

  const handleSubmit = async () => {
    if (isCashInsufficient) {
      alert('Nominal uang tunai yang diterima kurang dari total tagihan!');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(order.id, {
        paymentMethod: method,
        paymentChannel: channel,
        cashGiven: method === 'cash' ? cashGiven : undefined,
        change: method === 'cash' ? change : undefined,
      });

      playSuccessSound();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal mengonfirmasi pembayaran. Silakan periksa koneksi.');
    } finally {
      setIsSubmitting(false);
    }
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
      id="cashier-payment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2d4b3e] flex items-center justify-center text-white">
              <Banknote className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Konfirmasi Pembayaran Kasir</h3>
              <p className="text-xs text-gray-300">
                Nota #{order.invoiceNumber} • {order.customerName}
              </p>
            </div>
          </div>
          <button
            id="close-payment-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAFAF8]">
          {/* Order Details Brief */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-gray-700">
                <User className="w-3.5 h-3.5 text-[#2D4B3E]" />
                <span>Pelanggan: {order.customerName}</span>
                {order.customerPhone && (
                  <span className="text-gray-500 font-mono">({order.customerPhone})</span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Menunggu Kasir
              </span>
            </div>

            {/* Items summary */}
            <div className="text-xs space-y-1 text-gray-600 max-h-24 overflow-y-auto pr-1">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="truncate max-w-[240px]">
                    • {it.productName} ({formatWeight(it.quantityKg)})
                  </span>
                  <span className="font-semibold text-gray-900">{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Total Tagihan:
              </span>
              <span className="text-xl font-black text-[#234334]">
                {formatRupiah(order.finalTotal)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector (4 Primary Channels) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 block">
              Pilih Saluran Pembayaran Diterima:
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMethod('cash');
                  setChannel('Tunai Langsung / COD');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  method === 'cash'
                    ? 'btn-timbul-primary'
                    : 'btn-timbul-white text-gray-700'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('qris');
                  setChannel('QRIS AsinGo Official');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  method === 'qris'
                    ? 'btn-timbul-primary'
                    : 'btn-timbul-white text-gray-700'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('transfer');
                  setChannel('Bank BCA');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  method === 'transfer'
                    ? 'btn-timbul-primary'
                    : 'btn-timbul-white text-gray-700'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('ewallet');
                  setChannel('DANA');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  method === 'ewallet'
                    ? 'btn-timbul-primary'
                    : 'btn-timbul-white text-gray-700'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>E-Wallet</span>
              </button>
            </div>
          </div>

          {/* Conditional Details based on Method */}
          {/* 1. TUNAI / CASH */}
          {method === 'cash' && (
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-700">
                  Uang Tunai Diterima dari Pelanggan:
                </label>
                <input
                  id="cash-input-modal"
                  type="number"
                  step="1000"
                  value={cashGiven || ''}
                  onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                  className="w-32 px-3 py-1.5 text-right font-black text-sm border border-gray-300 rounded-lg bg-[#F8FAF9] focus:outline-none focus:border-[#2D4B3E]"
                />
              </div>

              {/* Quick Money Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetQuickCash(order.finalTotal)}
                  className="btn-timbul-white px-2.5 py-1 text-xs font-bold rounded-lg"
                >
                  Uang Pas ({formatRupiah(order.finalTotal)})
                </button>
                {[50000, 100000, 200000, 500000].map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => handleSetQuickCash(nominal)}
                    className="btn-timbul-white px-2.5 py-1 text-xs font-bold rounded-lg"
                  >
                    {nominal / 1000}rb
                  </button>
                ))}
              </div>

              {/* Kembalian Display */}
              <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                <span className="text-xs font-bold text-gray-700">Kembalian ke Pelanggan:</span>
                <span
                  className={`font-black text-base ${
                    !isCashInsufficient ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {!isCashInsufficient
                    ? formatRupiah(change)
                    : `Kurang ${formatRupiah(order.finalTotal - cashGiven)}`}
                </span>
              </div>
            </div>
          )}

          {/* 2. QRIS TOKO */}
          {method === 'qris' && (
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs text-center space-y-3">
              <div className="inline-block p-3 bg-white border border-gray-300 rounded-2xl shadow-xs">
                <QrCode className="w-28 h-28 mx-auto text-[#1B2E25]" />
              </div>
              <div>
                <p className="font-black text-sm text-[#1B2E25]">QRIS Standar Pembayaran Nasional</p>
                <p className="text-xs text-gray-500 font-mono">NMID: ID1020260922883 (AsinGo Official)</p>
                <p className="text-xs text-emerald-700 font-bold mt-1">
                  Tagihan: {formatRupiah(order.finalTotal)} (Bebas Biaya Admin)
                </p>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-[11px] text-blue-900 text-left">
                💡 <b>Panduan Kasir:</b> Cek notifikasi aplikasi bank/QRIS Anda atau minta bukti transfer dari pelanggan sebelum konfirmasi lunas.
              </div>
            </div>
          )}

          {/* 3. TRANSFER BANK */}
          {method === 'transfer' && (
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <span className="text-xs font-bold text-gray-700 block">
                Pilih Rekening Tujuan Transfer:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {bankList.map((b) => (
                  <button
                    key={b.bankName}
                    type="button"
                    onClick={() => setChannel(`Bank ${b.bankName}`)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      channel === `Bank ${b.bankName}`
                        ? 'border-[#2D4B3E] bg-[#E8F2EC] font-bold text-[#1B2E25]'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">{b.bankName}</span>
                      {channel === `Bank ${b.bankName}` && (
                        <Check className="w-3.5 h-3.5 text-[#2D4B3E]" />
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-gray-600 mt-0.5">
                      {b.accountNumber}
                    </div>
                    <div className="text-[10px] text-gray-500">{b.accountHolder}</div>
                  </button>
                ))}
              </div>

              {/* Selected Bank Copy Helper */}
              {channel.startsWith('Bank ') && (
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] block">Nomor Rekening Terpilih:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {bankList.find((b) => `Bank ${b.bankName}` === channel)?.accountNumber || ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const acc = bankList.find((b) => `Bank ${b.bankName}` === channel)?.accountNumber;
                      if (acc) handleCopy(acc, 'bank');
                    }}
                    className="btn-timbul-white px-2 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1"
                  >
                    {copiedBank === 'bank' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedBank === 'bank' ? 'Tersalin' : 'Salin Rekening'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. E-WALLET */}
          {method === 'ewallet' && (
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <span className="text-xs font-bold text-gray-700 block">
                Pilih Akun E-Wallet Toko:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ewalletList.map((w) => (
                  <button
                    key={w.walletName}
                    type="button"
                    onClick={() => setChannel(w.walletName)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      channel === w.walletName
                        ? 'border-[#2D4B3E] bg-[#E8F2EC] font-bold text-[#1B2E25]'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">{w.walletName}</span>
                      {channel === w.walletName && (
                        <Check className="w-3.5 h-3.5 text-[#2D4B3E]" />
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-gray-600 mt-0.5">
                      {w.phoneNumber}
                    </div>
                    <div className="text-[10px] text-gray-500">{w.accountHolder}</div>
                  </button>
                ))}
              </div>

              {channel && (
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] block">No. E-Wallet Terpilih ({channel}):</span>
                    <span className="font-mono font-bold text-gray-900">
                      {ewalletList.find((w) => w.walletName === channel)?.phoneNumber || ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const num = ewalletList.find((w) => w.walletName === channel)?.phoneNumber;
                      if (num) handleCopy(num, 'ewallet');
                    }}
                    className="btn-timbul-white px-2 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1"
                  >
                    {copiedBank === 'ewallet' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedBank === 'ewallet' ? 'Tersalin' : 'Salin Nomor'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Confirmation */}
        <div className="p-4 bg-white border-t border-gray-200 space-y-2 shrink-0">
          <button
            id="confirm-payment-btn"
            type="button"
            disabled={isSubmitting || isCashInsufficient}
            onClick={handleSubmit}
            className="w-full btn-timbul-primary py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-5 h-5 text-emerald-300" />
            <span>
              {isSubmitting
                ? 'Mengesahkan Pembayaran...'
                : `SAHKAN PEMBAYARAN LUNAS • ${formatRupiah(order.finalTotal)}`}
            </span>
          </button>
          <p className="text-[11px] text-gray-500 text-center">
            Stok ikan asin akan otomatis terpotong dan transaksi dicatat ke laporan resmi kasir.
          </p>
        </div>
      </div>
    </div>
  );
};
