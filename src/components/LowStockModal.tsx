import React, { useState } from 'react';
import { Product } from '../types';
import { formatWeight } from '../lib/exportUtils';
import { AlertTriangle, X, CheckCircle, PackagePlus } from 'lucide-react';

interface LowStockModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onRestock: (productId: string, addKg: number, note: string) => Promise<void>;
}

export const LowStockModal: React.FC<LowStockModalProps> = ({
  products,
  isOpen,
  onClose,
  onRestock,
}) => {
  const lowStockList = products.filter((p) => p.currentStockKg <= p.minStockKg);
  const [restockAmounts, setRestockAmounts] = useState<{ [id: string]: number }>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickAdd = async (productId: string, defaultAdd: number) => {
    const amount = restockAmounts[productId] || defaultAdd;
    if (amount <= 0) return;
    setLoadingId(productId);
    try {
      await onRestock(productId, amount, 'Restock cepat dari notifikasi stok menipis');
      setRestockAmounts((prev) => ({ ...prev, [productId]: 0 }));
    } catch (e) {
      console.error(e);
      alert('Gagal menambah stok');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div id="low-stock-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#b45309] px-5 py-4 flex items-center justify-between text-white border-b border-[#78350f]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-200" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Peringatan Stok Ikan Asin Menipis</h3>
              <p className="text-xs text-amber-100">{lowStockList.length} jenis ikan asin membutuhkan restock segera</p>
            </div>
          </div>
          <button
            id="close-low-stock-btn"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-[#FAFAF8]">
          {lowStockList.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-base text-gray-800">Semua Stok Ikan Asin Aman!</h4>
              <p className="text-xs text-gray-500 mt-1">Tidak ada produk yang berada di bawah batas minimum.</p>
            </div>
          ) : (
            lowStockList.map((product) => {
              const currentInput = restockAmounts[product.id] || 10;
              return (
                <div
                  key={product.id}
                  className="bg-white p-4 rounded-xl border border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                        {product.code} • {product.category}
                      </span>
                      <h4 className="font-bold text-sm text-[#1B2E25] mt-0.5 truncate">{product.name}</h4>
                      <div className="flex items-center gap-3 text-xs mt-1">
                        <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          Sisa: {formatWeight(product.currentStockKg)}
                        </span>
                        <span className="text-gray-500">
                          Batas Min: {formatWeight(product.minStockKg)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Restock action */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={currentInput}
                        onChange={(e) =>
                          setRestockAmounts({ ...restockAmounts, [product.id]: Number(e.target.value) })
                        }
                        className="w-16 px-2 py-1.5 text-center text-xs font-bold focus:outline-none"
                      />
                      <span className="bg-gray-100 px-2 py-1.5 text-xs text-gray-600 font-semibold border-l border-gray-200">
                        kg
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={loadingId === product.id}
                      onClick={() => handleQuickAdd(product.id, currentInput)}
                      className="btn-timbul-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      {loadingId === product.id ? 'Menyimpan...' : '+ Tambah'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Perubahan stok langsung tersinkronisasi ke semua kasir secara real-time.
          </p>
          <button
            id="close-low-stock-footer-btn"
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
