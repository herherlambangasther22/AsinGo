import React, { useState } from 'react';
import { Product } from '../types';
import { PRESET_IMAGE_SUGGESTIONS } from '../data/initialProducts';
import { X, Upload, Link, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploadModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveImage: (productId: string, newImageUrl: string) => Promise<void>;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaveImage,
}) => {
  if (!isOpen || !product) return null;

  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'preset'>('upload');
  const [selectedUrl, setSelectedUrl] = useState<string>(product.imageUrl);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file maksimal 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedUrl(reader.result);
          setPreviewError(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlApply = () => {
    if (urlInput.trim()) {
      setSelectedUrl(urlInput.trim());
      setPreviewError(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUrl) return;
    setIsLoading(true);
    try {
      await onSaveImage(product.id, selectedUrl);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui gambar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="image-upload-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Ubah Foto Produk Ikan Asin</h3>
              <p className="text-xs text-gray-300">Sinkronisasi Real-Time ke Semua Pengguna</p>
            </div>
          </div>
          <button
            id="close-image-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="bg-[#F2F7F4] p-3 rounded-xl border border-gray-300 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-300 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={selectedUrl || product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setPreviewError(true)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#2D4B3E] uppercase tracking-wider">{product.code} • {product.category}</p>
              <h4 className="font-bold text-sm text-[#1B2E25] truncate">{product.name}</h4>
              <p className="text-xs text-gray-500">Semua kasir &amp; pelanggan akan melihat gambar ini secara seragam.</p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-[#F2F7F4] p-1 rounded-xl border border-gray-300">
            <button
              id="tab-upload-file"
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'btn-timbul-primary'
                  : 'btn-timbul-white text-gray-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Foto
            </button>
            <button
              id="tab-preset-fish"
              type="button"
              onClick={() => setActiveTab('preset')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'preset'
                  ? 'btn-timbul-primary'
                  : 'btn-timbul-white text-gray-700'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Koleksi Asli
            </button>
            <button
              id="tab-url-link"
              type="button"
              onClick={() => setActiveTab('url')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'url'
                  ? 'btn-timbul-primary'
                  : 'btn-timbul-white text-gray-700'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              Tautan URL
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-gray-300 bg-[#FAFAF8] hover:bg-[#F2F7F4] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
                <Upload className="w-8 h-8 text-[#2D4B3E] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold text-[#1B2E25]">Klik untuk Memilih Foto Ikan Asin</span>
                <span className="text-xs text-gray-500 mt-1">Mendukung format JPG, PNG, WEBP (Bisa langsung foto kamera HP)</span>
                <input
                  id="file-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {activeTab === 'preset' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">Pilih dari koleksi foto standar ikan asin Nusantara:</p>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {PRESET_IMAGE_SUGGESTIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedUrl(preset.url);
                      setPreviewError(false);
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      selectedUrl === preset.url
                        ? 'border-[#2D4B3E] bg-[#E2EDE7] ring-1 ring-[#2D4B3E]'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                    <span className="text-xs font-semibold text-[#1B2E25] line-clamp-2">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Tautan / URL Gambar Online</label>
                <div className="flex gap-2">
                  <input
                    id="input-img-url"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://contoh.com/gambar-ikan-asin.jpg"
                    className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
                  />
                  <button
                    id="apply-url-btn"
                    type="button"
                    onClick={handleUrlApply}
                    className="btn-timbul-primary px-4 py-2 text-xs font-bold rounded-lg"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Large Preview */}
          <div className="mt-2">
            <p className="text-xs font-bold text-gray-700 mb-1">Pratinjau Gambar:</p>
            <div className="w-full h-44 bg-gray-100 rounded-xl border border-gray-300 overflow-hidden flex items-center justify-center relative">
              {selectedUrl && !previewError ? (
                <img
                  src={selectedUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <div className="text-center p-4 text-gray-400 flex flex-col items-center">
                  <AlertCircle className="w-8 h-8 mb-1 text-amber-500" />
                  <span className="text-xs font-medium text-gray-600">Gambar belum dipilih atau gagal dimuat</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#FAFAF8] px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            id="cancel-image-btn"
            type="button"
            onClick={onClose}
            className="btn-timbul-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            Batal
          </button>
          <button
            id="save-image-server-btn"
            type="button"
            disabled={isLoading || !selectedUrl}
            onClick={handleSave}
            className="btn-timbul-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isLoading ? 'Menyimpan...' : 'Simpan &amp; Sinkronkan'}
          </button>
        </div>
      </div>
    </div>
  );
};
