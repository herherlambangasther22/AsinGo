import React, { useState } from 'react';
import { Product, StockLog, StoreSettings, User } from '../types';
import { formatRupiah, formatWeight, formatDateTimeIndo, exportInventoryToExcel, exportInventoryToPDF } from '../lib/exportUtils';
import {
  Boxes,
  Plus,
  PackagePlus,
  Camera,
  Edit,
  Trash2,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  History,
  Search,
  Save,
  X,
} from 'lucide-react';

interface StockManagerProps {
  products: Product[];
  stockLogs: StockLog[];
  settings: StoreSettings;
  currentUser: User;
  onOpenImageModal: (product: Product) => void;
  onAdjustStock: (productId: string, changeKg: number, type: StockLog['type'], note: string) => Promise<void>;
  onSaveProduct: (product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
}

export const StockManager: React.FC<StockManagerProps> = ({
  products,
  stockLogs,
  settings,
  currentUser,
  onOpenImageModal,
  onAdjustStock,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'logs'>('inventory');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Modal states
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState<boolean>(false);
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [restockType, setRestockType] = useState<StockLog['type']>('restock');
  const [restockNote, setRestockNote] = useState<string>('Penerimaan kiriman baru');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const categories = ['Semua', 'Teri & Bilis', 'Ikan Kering Belah', 'Jambal & Gabus', 'Cumi & Seafood', 'Ikan Air Tawar & Sungai', 'Bal-balan & Grosir'];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.origin && p.origin.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const totalStockKg = products.reduce((sum, p) => sum + p.currentStockKg, 0);
  const totalAssetValue = products.reduce((sum, p) => sum + p.pricePerKg * p.currentStockKg, 0);
  const lowStockCount = products.filter((p) => p.currentStockKg <= p.minStockKg).length;

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalProduct || restockAmount === 0) return;
    setIsSubmitting(true);
    try {
      const change = restockType === 'spoilage' ? -Math.abs(restockAmount) : restockAmount;
      await onAdjustStock(restockModalProduct.id, change, restockType, restockNote);
      setRestockModalProduct(null);
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui stok');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.pricePerKg) {
      alert('Nama dan harga wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaveProduct({
        ...editingProduct,
        updatedBy: currentUser.name,
      });
      setEditingProduct(null);
      setIsNewProduct(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data produk');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Metrics Cards - Clean Flat Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Volume Stok</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-black text-2xl text-[#1B2E25]">{formatWeight(totalStockKg)}</span>
            <span className="text-xs font-bold bg-[#E2EDE7] text-[#1B2E25] px-2.5 py-1 rounded-lg">
              {products.length} Jenis Ikan
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Estimasi Nilai Aset Stok</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-black text-2xl text-[#1B2E25]">{formatRupiah(totalAssetValue)}</span>
            <span className="text-xs text-gray-500 font-medium">Harga Grosir / Eceran</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Perlu Restock Segera</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`font-black text-2xl ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
              {lowStockCount} Jenis Ikan
            </span>
            {lowStockCount > 0 ? (
              <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                Stok Menipis
              </span>
            ) : (
              <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                Semua Aman
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Inventory Container - Clean Flat Style */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header with Navigation & Action Buttons */}
        <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAFAF8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1b2e25] text-white flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[#1B2E25]">Manajemen Stok &amp; Master Ikan Asin</h2>
              <p className="text-xs text-gray-500">
                Sinkronisasi otomatis ke semua kasir &amp; perangkat secara real-time
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="export-stock-excel-btn"
              type="button"
              onClick={() => exportInventoryToExcel(products, 'Stok_Ikan_Asin_AsinGo')}
              className="btn-timbul-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              Excel (.xlsx)
            </button>
            <button
              id="export-stock-pdf-btn"
              type="button"
              onClick={() => exportInventoryToPDF(products, settings)}
              className="btn-timbul-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-rose-700" />
              PDF
            </button>
            <button
              id="add-new-product-btn"
              type="button"
              onClick={() => {
                setIsNewProduct(true);
                setEditingProduct({
                  name: '',
                  code: `ASN-${String(products.length + 1).padStart(3, '0')}`,
                  category: 'Ikan Kering Belah',
                  pricePerKg: 80000,
                  currentStockKg: 10,
                  minStockKg: 5,
                  unit: 'kg',
                  qualityGrade: 'Super',
                  origin: 'Lokal',
                  description: '',
                  imageUrl: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=600&auto=format&fit=crop&q=80',
                  isAvailable: true,
                });
              }}
              className="btn-timbul-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              + Tambah Ikan Asin
            </button>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#F2F7F4] p-1 rounded-xl border border-gray-300 w-full sm:w-auto">
            <button
              id="tab-inventory-list"
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'btn-timbul-white bg-white text-[#1b2e25]'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              Daftar Stok ({products.length})
            </button>
            <button
              id="tab-stock-logs"
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'btn-timbul-white bg-white text-[#1b2e25]'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Riwayat Keluar / Masuk ({stockLogs.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, SKU, atau asal ikan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAF9] border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
            />
          </div>
        </div>

        {/* Tab 1: Inventory Table */}
        {activeTab === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-[#1B2E25] border-b border-gray-200 font-bold">
                <tr>
                  <th className="p-3.5 pl-5">Foto &amp; Nama Produk</th>
                  <th className="p-3.5">Kategori &amp; Asal</th>
                  <th className="p-3.5">Harga / Kg</th>
                  <th className="p-3.5">Stok Saat Ini</th>
                  <th className="p-3.5">Batas Min.</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-center">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const isLow = product.currentStockKg <= product.minStockKg;
                  const isZero = product.currentStockKg <= 0;

                  return (
                    <tr key={product.id} className="hover:bg-[#F9FAF9] transition-colors">
                      {/* Product with Photo */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg bg-gray-100 border border-gray-300 overflow-hidden shrink-0 group">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => onOpenImageModal(product)}
                              title="Ubah Foto"
                              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold bg-[#E2EDE7] text-[#1B2E25] px-1.5 py-0.2 rounded">
                              {product.code}
                            </span>
                            <h4 className="font-bold text-sm text-[#1B2E25] mt-0.5">{product.name}</h4>
                            <p className="text-[11px] text-gray-500">Grade: {product.qualityGrade || 'Super'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category & Origin */}
                      <td className="p-3.5">
                        <span className="font-semibold text-gray-800">{product.category}</span>
                        <p className="text-[11px] text-gray-500">{product.origin || 'Lokal'}</p>
                      </td>

                      {/* Price */}
                      <td className="p-3.5 font-bold text-sm text-[#1B2E25]">
                        {formatRupiah(product.pricePerKg)}
                      </td>

                      {/* Stock */}
                      <td className="p-3.5">
                        <span className="font-black text-sm text-gray-900">{formatWeight(product.currentStockKg)}</span>
                      </td>

                      {/* Min Stock */}
                      <td className="p-3.5 text-gray-600 font-medium">
                        {formatWeight(product.minStockKg)}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {isZero ? (
                          <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-300 text-[10px]">
                            Habis
                          </span>
                        ) : isLow ? (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 text-[10px] flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 text-[10px]">
                            Aman
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Restock Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setRestockModalProduct(product);
                              setRestockAmount(10);
                              setRestockType('restock');
                              setRestockNote('Penerimaan kiriman baru');
                            }}
                            className="btn-timbul-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            Restock
                          </button>

                          {/* Ubah Foto Button */}
                          <button
                            type="button"
                            onClick={() => onOpenImageModal(product)}
                            title="Ubah Foto Produk"
                            className="btn-timbul-white p-1.5 rounded-lg"
                          >
                            <Camera className="w-4 h-4 text-gray-700" />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewProduct(false);
                              setEditingProduct({ ...product });
                            }}
                            title="Edit Data Produk"
                            className="btn-timbul-white p-1.5 rounded-lg"
                          >
                            <Edit className="w-4 h-4 text-gray-700" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Yakin ingin menghapus ${product.name}?`)) {
                                onDeleteProduct(product.id);
                              }
                            }}
                            title="Hapus Produk"
                            className="btn-timbul-danger p-1.5 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Stock Movement Logs */}
        {activeTab === 'logs' && (
          <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {stockLogs.map((log) => {
              const isPositive = log.changeKg > 0;
              return (
                <div
                  key={log.id}
                  className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between gap-3 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1B2E25]">{log.productName}</h4>
                      <p className="text-gray-500 text-[11px]">{log.note} • Dicatat oleh: {log.createdBy}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black text-sm ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}
                    >
                      {isPositive ? `+${log.changeKg} kg` : `${log.changeKg} kg`}
                    </span>
                    <p className="text-[10px] text-gray-400">{formatDateTimeIndo(log.createdAt)}</p>
                    <p className="text-[10px] text-gray-500">
                      Sisa: {log.previousStockKg} → {log.newStockKg} kg
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Restock / Adjust Stock */}
      {restockModalProduct && (
        <div id="restock-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e]">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">Restock &amp; Penyesuaian Stok</h3>
                  <p className="text-xs text-gray-300">{restockModalProduct.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalProduct(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-5 space-y-4">
              <div className="bg-[#F8FAF9] p-3 rounded-xl border border-gray-200 text-xs">
                <div className="flex justify-between font-medium text-gray-600">
                  <span>Stok Saat Ini:</span>
                  <span className="font-bold text-gray-900">{formatWeight(restockModalProduct.currentStockKg)}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-600 mt-1">
                  <span>Batas Minimum:</span>
                  <span className="font-bold text-gray-900">{formatWeight(restockModalProduct.minStockKg)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Jenis Operasi Stok:</label>
                <select
                  value={restockType}
                  onChange={(e) => setRestockType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
                >
                  <option value="restock">Barang Masuk / Kiriman Baru (+)</option>
                  <option value="adjustment">Koreksi Opname (+ / -)</option>
                  <option value="spoilage">Barang Rusak / Susut / Dibuang (-)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Jumlah (Kg):</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-bold border-2 border-[#2D4B3E] rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Keterangan / Catatan:</label>
                <input
                  type="text"
                  required
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="Contoh: Kiriman Kapal Nelayan Muara Baru"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setRestockModalProduct(null)}
                  className="btn-timbul-white px-4 py-2 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-timbul-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit or Add Product Form */}
      {editingProduct && (
        <div id="product-form-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e]">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">
                    {isNewProduct ? 'Tambah Jenis Ikan Asin Baru' : 'Edit Data Ikan Asin'}
                  </h3>
                  <p className="text-xs text-gray-300">Disinkronkan ke Seluruh Perangkat Real-Time</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductFormSubmit} className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Kode SKU</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.code || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Kategori</label>
                  <select
                    value={editingProduct.category || 'Ikan Kering Belah'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
                  >
                    {categories.filter((c) => c !== 'Semua').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nama Ikan Asin</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Contoh: Ikan Asin Teri Medan Super"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E] font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Harga / Kg (Rp)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={editingProduct.pricePerKg || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, pricePerKg: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Stok Awal (Kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={editingProduct.currentStockKg ?? 10}
                    onChange={(e) => setEditingProduct({ ...editingProduct, currentStockKg: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Batas Min (Kg)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={editingProduct.minStockKg ?? 5}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStockKg: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Grade Kualitas</label>
                  <select
                    value={editingProduct.qualityGrade || 'Super'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, qualityGrade: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  >
                    <option value="Super">Grade Super (Pilihan)</option>
                    <option value="Premium">Grade Premium</option>
                    <option value="Standar">Grade Standar</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Asal Daerah</label>
                  <input
                    type="text"
                    value={editingProduct.origin || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, origin: e.target.value })}
                    placeholder="Contoh: Medan, Cirebon, Tuban"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Deskripsi Produk</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Deskripsi keunggulan ikan asin, rasa, cara olah..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="btn-timbul-white px-4 py-2 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-timbul-primary px-5 py-2 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
