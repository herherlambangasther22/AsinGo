import React, { useState, useRef, useEffect } from 'react';
import { StoreSettings } from '../types';
import {
  X,
  Settings,
  Phone,
  MessageCircle,
  Store,
  MapPin,
  Save,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Eye,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface SettingsModalProps {
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  onTriggerLoadingPreview?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaveSettings,
  onTriggerLoadingPreview,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'logo'>('logo');
  const [formData, setFormData] = useState<StoreSettings>({
    ...settings,
    logoUrl: settings.logoUrl || '/logo.svg',
    loadingLogoUrl: settings.loadingLogoUrl || settings.logoUrl || '/logo.svg',
  });
  const [syncLoadingLogo, setSyncLoadingLogo] = useState<boolean>(
    !settings.loadingLogoUrl || settings.loadingLogoUrl === settings.logoUrl
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadingFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync formData when modal opens or settings changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...settings,
        logoUrl: settings.logoUrl || '/logo.svg',
        loadingLogoUrl: settings.loadingLogoUrl || settings.logoUrl || '/logo.svg',
      });
      setSyncLoadingLogo(!settings.loadingLogoUrl || settings.loadingLogoUrl === settings.logoUrl);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isForLoading = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran file maksimal 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (isForLoading) {
        setFormData((prev) => ({ ...prev, loadingLogoUrl: result }));
      } else {
        setFormData((prev) => {
          const next = { ...prev, logoUrl: result };
          if (syncLoadingLogo) {
            next.loadingLogoUrl = result;
          }
          return next;
        });
      }
      setUploadSuccessToast('Gambar logo berhasil diunggah!');
      setTimeout(() => setUploadSuccessToast(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (isForLoading = false) => {
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim();
    if (isForLoading) {
      setFormData((prev) => ({ ...prev, loadingLogoUrl: url }));
    } else {
      setFormData((prev) => {
        const next = { ...prev, logoUrl: url };
        if (syncLoadingLogo) {
          next.loadingLogoUrl = url;
        }
        return next;
      });
    }
    setCustomUrlInput('');
    setUploadSuccessToast('URL logo berhasil diterapkan!');
    setTimeout(() => setUploadSuccessToast(null), 3000);
  };

  const handleResetToDefaultLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '/uploads/logo-1790060389221.png',
      loadingLogoUrl: '/uploads/loading-logo-1790060389226.png',
    }));
    setUploadSuccessToast('Kembali ke Logo AsinGo Resmi');
    setTimeout(() => setUploadSuccessToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalPayload: Partial<StoreSettings> = {
        ...formData,
        loadingLogoUrl: syncLoadingLogo ? formData.logoUrl : formData.loadingLogoUrl,
      };
      await onSaveSettings(finalPayload);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2d4b3e] flex items-center justify-center text-white">
              <Settings className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Pengaturan Admin &amp; Branding Toko</h3>
              <p className="text-xs text-gray-300">Ganti logo aplikasi, loading screen, dan profil toko</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-[#12221B] px-5 pt-2 flex items-center gap-2 border-b border-[#2D4B3E]">
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === 'logo'
                ? 'bg-white text-[#1B2E25] shadow-xs'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span>Logo &amp; Loading Screen</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-white text-[#1B2E25] shadow-xs'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Profil Toko &amp; WhatsApp</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAFAF8]">
          {uploadSuccessToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccessToast}</span>
            </div>
          )}

          {/* TAB 1: LOGO & LOADING SCREEN */}
          {activeTab === 'logo' && (
            <div className="space-y-5">
              {/* Card 1: Logo Aplikasi Utama (Navbar & Struk) */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2D4B3E]" />
                    <h4 className="font-bold text-sm text-[#1B2E25]">Logo Utama Aplikasi (Navbar &amp; Struk)</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToDefaultLogo}
                    className="text-[11px] text-[#2D4B3E] hover:underline font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset ke Default
                  </button>
                </div>

                {/* Live Logo Preview on dark header & white card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Preview on Navbar Theme */}
                  <div className="bg-[#1B2E25] p-3 rounded-xl border border-[#2D4B3E] flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border-2 border-[#2D4B3E] p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img
                        src={formData.logoUrl || '/logo.svg'}
                        alt="Logo Utama"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.svg';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                        Tampilan di Navbar
                      </span>
                      <span className="text-xs font-bold text-white block truncate">
                        {formData.storeName || 'AsinGo'}
                      </span>
                    </div>
                  </div>

                  {/* Preview on White / Struk */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-white border-2 border-[#2D4B3E] p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img
                        src={formData.logoUrl || '/logo.svg'}
                        alt="Logo Struk"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.svg';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">
                        Tampilan di Struk
                      </span>
                      <span className="text-xs font-bold text-gray-900 block truncate">
                        Struk Pembelian Kasir
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upload or URL Controls */}
                <div className="pt-2 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLogoInputMode('upload')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        logoInputMode === 'upload'
                          ? 'bg-[#2D4B3E] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Unggah File dari Perangkat
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoInputMode('url')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        logoInputMode === 'url'
                          ? 'bg-[#2D4B3E] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Tautan URL Gambar
                    </button>
                  </div>

                  {logoInputMode === 'upload' ? (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={(e) => handleFileUpload(e, false)}
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#2D4B3E]/40 hover:border-[#2D4B3E] bg-[#F7FAF8] hover:bg-[#EEF5F1] p-4 rounded-xl text-center cursor-pointer transition-colors"
                      >
                        <Upload className="w-6 h-6 text-[#2D4B3E] mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-[#1B2E25]">
                          Klik di sini untuk pilih file logo baru
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Format PNG, JPG, SVG, atau WebP (Maksimal 8MB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        placeholder="https://contoh.com/logo-toko.png atau /uploads/logo.png"
                        className="flex-1 px-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyUrl(false)}
                        className="btn-timbul-primary px-4 py-2 rounded-xl text-xs font-bold shrink-0"
                      >
                        Terapkan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Loading Screen Settings & Live Demo */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h4 className="font-bold text-sm text-[#1B2E25]">Desain &amp; Logo Loading Screen</h4>
                  </div>
                  {onTriggerLoadingPreview && (
                    <button
                      type="button"
                      onClick={onTriggerLoadingPreview}
                      className="btn-timbul-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Tes Tampilan Penuh</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-600">
                  Loading screen tampil saat membuka aplikasi: latar putih bersih, logo berbingkai border hijau tema AsinGo, dan progress bar hijau.
                </p>

                {/* Synchronize toggle */}
                <div className="flex items-center justify-between bg-[#F4F8F5] p-3 rounded-xl border border-[#2D4B3E]/30">
                  <label className="text-xs font-bold text-[#1B2E25] cursor-pointer flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2D4B3E]" />
                    Gunakan logo yang sama untuk Loading Screen
                  </label>
                  <input
                    type="checkbox"
                    checked={syncLoadingLogo}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSyncLoadingLogo(checked);
                      if (checked) {
                        setFormData((prev) => ({ ...prev, loadingLogoUrl: prev.logoUrl }));
                      }
                    }}
                    className="w-4 h-4 text-[#2D4B3E] rounded-md focus:ring-[#2D4B3E] cursor-pointer"
                  />
                </div>

                {/* Custom loading logo upload if unsynced */}
                {!syncLoadingLogo && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">
                      Pilih Logo Khusus Loading Screen:
                    </label>
                    <input
                      ref={loadingFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadingFileInputRef.current?.click()}
                        className="btn-timbul-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Unggah Logo Khusus
                      </button>
                      <span className="text-[11px] text-gray-500">
                        {formData.loadingLogoUrl ? 'Logo khusus aktif' : 'Belum ada file'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Interactive Mini Mockup of the Loading Screen (White bg, green border, green bar) */}
                <div className="mt-3 p-4 rounded-2xl bg-white border-2 border-gray-200 shadow-inner flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-[#2D4B3E] absolute top-2 right-3">
                    Pratinjau Desain
                  </div>

                  {/* Logo Container: White with Green Border */}
                  <div className="relative mt-2">
                    <div className="w-20 h-20 rounded-2xl bg-white border-[3px] border-[#2D4B3E] shadow-md flex items-center justify-center p-2.5 overflow-hidden">
                      <img
                        src={(syncLoadingLogo ? formData.logoUrl : formData.loadingLogoUrl) || '/logo.png'}
                        alt="Loading Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.png';
                        }}
                      />
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h5 className="font-extrabold text-sm text-[#1B2E25]">
                      {formData.storeName || 'AsinGo'}
                    </h5>
                    <p className="text-[11px] text-[#2D4B3E]/80 max-w-xs mx-auto truncate">
                      {formData.tagline || 'Pusat Aneka Ikan Asin Pilihan Segar & Higienis'}
                    </p>
                  </div>

                  {/* Green Loading Bar */}
                  <div className="w-48 space-y-1.5">
                    <div className="w-full h-2 bg-[#E8F0EC] rounded-full overflow-hidden border border-[#2D4B3E]/20 p-0.5">
                      <div className="w-3/4 h-full rounded-full bg-gradient-to-r from-[#1B2E25] via-[#2D4B3E] to-[#34D399] animate-pulse" />
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-[#2D4B3E]/90 px-0.5">
                      <span>Memuat Sistem Kasir...</span>
                      <span className="font-mono">75%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE & WHATSAPP */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
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
                      placeholder="AsinGo"
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
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
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
              {isSaving ? 'Menyimpan...' : 'Simpan & Terapkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
