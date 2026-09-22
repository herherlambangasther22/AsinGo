import React, { useState } from 'react';
import { StoreSettings } from '../types';
import { X, Settings, Phone, MessageCircle, Store, MapPin, Check, Save } from 'lucide-react';

interface SettingsModalProps {
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaveSettings,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2d4b3e] flex items-center justify-center text-white">
              <Settings className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Pengaturan Toko &amp; WhatsApp</h3>
              <p className="text-xs text-gray-300">Kelola nomor WhatsApp admin, nama toko &amp; struk</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAFAF8]">
          {/* Highlight: WhatsApp Admin Number */}
          <div className="bg-[#EAF2ED] p-4 rounded-xl border border-[#2D4B3E]/40 space-y-2">
            <label className="text-xs font-bold text-[#1B2E25] flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              Nomor WhatsApp Admin Penerima Pesanan (Kritis):
            </label>
            <input
              id="setting-owner-wa"
              type="text"
              required
              value={formData.ownerWaNumber}
              onChange={(e) => setFormData({ ...formData, ownerWaNumber: e.target.value })}
              placeholder="+62 895-3511-21278"
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E]"
            />
            <p className="text-[11px] text-[#2D4B3E]">
              Nomor ini akan menerima seluruh pesanan dari pelanggan katalog online dan rekap laporan omzet harian.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Nama Toko Ikan Asin:</label>
              <div className="relative">
                <Store className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="setting-store-name"
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="AsinGo Ikan Asin"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] font-bold text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Slogan / Tagline Toko:</label>
              <input
                id="setting-store-tagline"
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Pusat Aneka Ikan Asin Pilihan Segar & Higienis"
                className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Nomor Telepon Toko (Struk Kasir):</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="setting-store-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0895-3511-21278"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Alamat Gudang / Toko:</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <textarea
                  id="setting-store-address"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Pasar Grosir Ikan Nusantara No. 12"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] resize-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Pesan Footer Struk Pembayaran:</label>
              <input
                id="setting-footer-message"
                type="text"
                value={formData.footerReceiptMessage}
                onChange={(e) => setFormData({ ...formData, footerReceiptMessage: e.target.value })}
                placeholder="Terima kasih telah berbelanja di AsinGo! Simpan di tempat kering."
                className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              id="cancel-settings-btn"
              type="button"
              onClick={onClose}
              className="btn-timbul-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              Batal
            </button>
            <button
              id="save-settings-submit-btn"
              type="submit"
              disabled={isSaving}
              className="btn-timbul-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
