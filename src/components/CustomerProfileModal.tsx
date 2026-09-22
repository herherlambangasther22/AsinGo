import React, { useState } from 'react';
import { StoreSettings } from '../types';
import { X, User, Phone, MapPin, Shield, MessageCircle, Save, CheckCircle2 } from 'lucide-react';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  onOpenStaffLogin: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  settings,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  onOpenStaffLogin,
}) => {
  if (!isOpen) return null;

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveLocal = () => {
    localStorage.setItem('asingo_customer_name', customerName);
    localStorage.setItem('asingo_customer_phone', customerPhone);
    localStorage.setItem('asingo_customer_address', customerAddress);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleDirectWa = () => {
    const cleanNumber = settings.ownerWaNumber.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Halo Admin ${settings.storeName}, saya ingin bertanya perihal ketersediaan stok ikan asin.`);
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  return (
    <div
      id="customer-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2d4b3e] flex items-center justify-center text-white">
              <User className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Profil Pembeli</h3>
              <p className="text-xs text-gray-300">Data pengiriman &amp; pemesanan ikan asin</p>
            </div>
          </div>
          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAFAF8]">
          {/* Identity Form */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-[#1B2E25] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#2D4B3E]" /> Identitas Pemesan
            </h4>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Nama Lengkap / Warung:</label>
              <input
                id="input-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Ibu Fatimah / Resto Bahari"
                className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Nomor WhatsApp / HP:</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] font-medium font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Alamat Pengiriman Utama:</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <textarea
                  id="input-customer-address"
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Alamat lengkap, patokan, RT/RW, kecamatan & kota..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] font-medium resize-none"
                />
              </div>
            </div>

            <button
              id="save-customer-profile-btn"
              type="button"
              onClick={handleSaveLocal}
              className="w-full btn-timbul-primary py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 mt-2"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Data Profil Disimpan!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Data Pemesan
                </>
              )}
            </button>
          </div>

          {/* Contact Admin Card */}
          <div className="bg-[#EAF2ED] p-3.5 rounded-xl border border-[#2D4B3E]/30 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#2D4B3E] uppercase tracking-wider block">Bantuan &amp; CS Toko</span>
              <p className="text-xs font-bold text-[#1B2E25] mt-0.5">Admin {settings.storeName}</p>
              <p className="text-[11px] font-mono text-[#2D4B3E] font-semibold">{settings.ownerWaNumber}</p>
            </div>
            <button
              type="button"
              onClick={handleDirectWa}
              className="btn-timbul-wa px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat WA
            </button>
          </div>

          {/* Staff Login Link - Discreet for Owner/Staff */}
          <div className="pt-2 border-t border-gray-200 text-center">
            <p className="text-[11px] text-gray-500 mb-2">Apakah Anda pengelola atau kasir toko?</p>
            <button
              id="staff-login-trigger-btn"
              type="button"
              onClick={() => {
                onClose();
                onOpenStaffLogin();
              }}
              className="btn-timbul-white px-4 py-2 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 mx-auto"
            >
              <Shield className="w-4 h-4 text-[#2D4B3E]" />
              Masuk sebagai Staff / Admin
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-5 py-3 border-t border-gray-200 flex justify-end">
          <button
            id="close-profile-footer-btn"
            type="button"
            onClick={onClose}
            className="btn-timbul-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
