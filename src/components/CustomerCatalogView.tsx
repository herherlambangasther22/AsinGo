import React, { useState, useEffect } from 'react';
import { Product, StoreSettings, WeightOption, Order, PaymentMethod } from '../types';
import { formatRupiah, formatWeight } from '../lib/exportUtils';
import {
  Search,
  ShoppingBag,
  Plus,
  Trash2,
  MessageCircle,
  Store,
  Camera,
  X,
  ChevronRight,
  ArrowRight,
  Sparkles,
  MapPin,
  User,
  Phone,
  FileText,
  CheckCircle2,
  Table,
  Lock,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
  Smartphone,
  Clock,
  Send,
} from 'lucide-react';
import { CustomerOrderStatusModal } from './CustomerOrderStatusModal';
import { playCashierChime, playSuccessSound } from '../lib/audioSound';

export interface CustomerCartItem {
  product: Product;
  quantityKg: number;
  option: WeightOption;
}

interface CustomerCatalogViewProps {
  products: Product[];
  settings: StoreSettings;
  orders?: Order[];
  customerCart: CustomerCartItem[];
  setCustomerCart: React.Dispatch<React.SetStateAction<CustomerCartItem[]>>;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  onOpenImageModal?: (product: Product) => void;
  canEditPhotos?: boolean;
  onOpenStaffLogin?: (role?: 'owner' | 'kasir' | 'gudang') => void;
  onCreateCustomerOrder?: (orderPayload: Partial<Order>) => Promise<Order | null>;
}

export const CustomerCatalogView: React.FC<CustomerCatalogViewProps> = ({
  products,
  settings,
  orders = [],
  customerCart,
  setCustomerCart,
  isCartDrawerOpen,
  setIsCartDrawerOpen,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  onOpenImageModal,
  canEditPhotos,
  onOpenStaffLogin,
  onCreateCustomerOrder,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [selectedWeights, setSelectedWeights] = useState<{ [productId: string]: WeightOption }>({});
  const [toastAdded, setToastAdded] = useState<string | null>(null);
  const [showPriceTableModal, setShowPriceTableModal] = useState<boolean>(false);

  // New Cashier-Centric Order Flow states
  const [preferredMethod, setPreferredMethod] = useState<PaymentMethod>('transfer');
  const [preferredChannel, setPreferredChannel] = useState<string>('Bank BCA');
  const [activeCustomerOrder, setActiveCustomerOrder] = useState<Order | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Synchronize active order when updated in realtime by Cashier
  useEffect(() => {
    if (activeCustomerOrder && orders.length > 0) {
      const live = orders.find((o) => o.id === activeCustomerOrder.id);
      if (live) {
        if (activeCustomerOrder.paymentStatus === 'pending' && live.paymentStatus === 'paid') {
          playSuccessSound();
        }
        setActiveCustomerOrder(live);
      }
    }
  }, [orders, activeCustomerOrder]);

  const categories = ['Semua', 'Teri & Bilis', 'Ikan Kering Belah', 'Jambal & Gabus', 'Cumi & Seafood', 'Ikan Air Tawar & Sungai', 'Bal-balan & Grosir'];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.origin && p.origin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const getWeightInKg = (option: WeightOption): number => {
    switch (option) {
      case '100g':
        return 0.1;
      case '250g':
        return 0.25;
      case '500g':
        return 0.5;
      case '1kg':
        return 1.0;
      case '5kg':
        return 5.0;
      case '10kg':
        return 10.0;
      default:
        return 1.0;
    }
  };

  const handleAddToCart = (product: Product) => {
    const opt = selectedWeights[product.id] || '1kg';
    const kg = getWeightInKg(opt);

    const existingIdx = customerCart.findIndex((c) => c.product.id === product.id && c.option === opt);
    if (existingIdx >= 0) {
      const updated = [...customerCart];
      updated[existingIdx].quantityKg = Number((updated[existingIdx].quantityKg + kg).toFixed(2));
      setCustomerCart(updated);
    } else {
      setCustomerCart([...customerCart, { product, quantityKg: kg, option: opt }]);
    }

    setToastAdded(`${product.name} (${opt}) ditambahkan ke keranjang`);
    setTimeout(() => setToastAdded(null), 2500);
  };

  const handleRemoveItem = (idx: number) => {
    setCustomerCart(customerCart.filter((_, i) => i !== idx));
  };

  const handleUpdateItemQty = (idx: number, change: number) => {
    const updated = [...customerCart];
    const item = updated[idx];
    const step = getWeightInKg(item.option);
    const newQty = Number((item.quantityKg + (change * step)).toFixed(2));
    if (newQty <= 0) {
      handleRemoveItem(idx);
    } else {
      item.quantityKg = newQty;
      setCustomerCart(updated);
    }
  };

  const cartTotal = customerCart.reduce((sum, item) => sum + item.product.pricePerKg * item.quantityKg, 0);
  const cartTotalKg = customerCart.reduce((sum, item) => sum + item.quantityKg, 0);
  const cartTotalItemCount = customerCart.length;

  const handleSendOrderWhatsApp = () => {
    if (customerCart.length === 0) return;

    let msg = `*HALO ASINGO, SAYA INGIN MEMESAN IKAN ASIN*\n`;
    msg += `------------------------------------\n`;
    msg += `Nama Pemesan: *${customerName.trim() || 'Pelanggan'}*\n`;
    if (customerPhone.trim()) {
      msg += `No. HP/WA: ${customerPhone.trim()}\n`;
    }
    if (customerAddress.trim()) {
      msg += `Alamat Pengiriman: ${customerAddress.trim()}\n`;
    }
    msg += `------------------------------------\n`;
    msg += `*DAFTAR PESANAN IKAN ASIN:*\n`;

    customerCart.forEach((item, idx) => {
      const subtotal = item.product.pricePerKg * item.quantityKg;
      msg += `${idx + 1}. *${item.product.name}* [${item.option}]\n`;
      msg += `   Jumlah: ${formatWeight(item.quantityKg)} × (Rp ${item.product.pricePerKg.toLocaleString('id-ID')}/kg)\n`;
      msg += `   Subtotal: ${formatRupiah(subtotal)}\n`;
    });

    msg += `------------------------------------\n`;
    msg += `*TOTAL ESTIMASI: ${formatRupiah(cartTotal)}*\n`;
    msg += `Total Berat: ${formatWeight(cartTotalKg)}\n`;
    if (customerNotes.trim()) {
      msg += `Catatan Pesanan: ${customerNotes.trim()}\n`;
    }
    msg += `\nMohon konfirmasi ketersediaan stok dan biaya ongkir ke alamat kami. Terima kasih! 🙏`;

    const encoded = encodeURIComponent(msg);
    const targetPhone = settings.ownerWaNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${targetPhone}?text=${encoded}`, '_blank');
  };

  const handleSendOrderToCashier = async () => {
    if (customerCart.length === 0) return;
    if (!customerName.trim()) {
      alert('Silakan masukkan Nama Pemesan atau Nama Warung Anda!');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Silakan masukkan Nomor WhatsApp / HP aktif untuk konfirmasi kasir!');
      return;
    }

    if (!onCreateCustomerOrder) {
      handleSendOrderWhatsApp();
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderItems = customerCart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantityKg: item.quantityKg,
        pricePerKg: item.product.pricePerKg,
        subtotal: Math.round(item.product.pricePerKg * item.quantityKg),
      }));

      const newOrder = await onCreateCustomerOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        notes: customerNotes.trim(),
        items: orderItems,
        subtotal: cartTotal,
        discount: 0,
        finalTotal: cartTotal,
        paymentMethod: preferredMethod,
        paymentChannel: preferredChannel,
        orderSource: 'web_pelanggan',
        paymentStatus: 'pending',
      });

      if (newOrder) {
        setActiveCustomerOrder(newOrder);
        setIsStatusModalOpen(true);
        setIsCartDrawerOpen(false);
        setCustomerCart([]);
        playCashierChime();
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kendala saat mengirim pesanan ke kasir. Silakan coba lagi.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 md:pb-12">
      {/* Visual Toast Notification on Add Item */}
      {toastAdded && (
        <div className="fixed top-20 right-4 z-50 bg-[#1B2E25] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-500 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastAdded}</span>
        </div>
      )}

      {/* Store Banner - Clean Flat Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border-2 border-[#2D4B3E] shadow-xs flex items-center justify-center p-1 overflow-hidden shrink-0">
              <img
                src={settings.logoUrl || '/logo.png'}
                alt={settings.storeName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
            <div>
              <h1 className="font-black text-xl sm:text-2xl text-[#1B2E25]">Katalog Ikan Asin Pilihan</h1>
              <p className="text-[11px] text-[#2D4B3E] font-bold tracking-wide uppercase">{settings.storeName}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 max-w-xl leading-relaxed mt-1">
            Pusat aneka ikan asin segar pilihan langsung dari pengeringan nelayan pesisir. Pilih berat kemasan dan pesan langsung ke WhatsApp Admin toko.
          </p>
        </div>

        {/* WhatsApp Store Info Pill */}
        <div className="flex items-center gap-3 bg-[#F2F7F4] p-3 rounded-xl border border-gray-300 text-xs shrink-0">
          <div className="w-10 h-10 rounded-lg bg-white border border-[#2D4B3E]/30 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
            <img
              src={settings.logoUrl || '/logo.png'}
              alt={settings.storeName}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>
          <div>
            <span className="font-bold text-gray-900 block">{settings.storeName}</span>
            <span className="text-[11px] text-[#2D4B3E] font-bold font-mono">
              WA: {settings.ownerWaNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="customer-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ikan asin (Teri Nasi, Kembung, Gabus, Sepat, Cumi, Manyung...)"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAF9] border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#2D4B3E]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowPriceTableModal(true)}
            className="btn-timbul-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <Table className="w-4 h-4 text-emerald-300" />
            <span>Lihat Tabel Daftar Harga (10 Jenis)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'btn-timbul-primary' : 'btn-timbul-white text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid - Full Width without side clutter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {filteredProducts.map((product) => {
          const currentOption = selectedWeights[product.id] || '1kg';
          const currentWeightKg = getWeightInKg(currentOption);
          const cardPrice = Math.round(product.pricePerKg * currentWeightKg);
          const isAvailable = product.currentStockKg > 0;

          return (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-[#2D4B3E] transition-all group"
            >
              {/* Product Image */}
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="bg-[#1b2e25]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                    Grade {product.qualityGrade || 'Super'}
                  </span>
                </div>

                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
                      isAvailable ? 'bg-emerald-700 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {isAvailable ? `Stok: ${formatWeight(product.currentStockKg)}` : 'Habis'}
                  </span>
                </div>

                {canEditPhotos && onOpenImageModal && (
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(product)}
                    className="btn-timbul-white absolute bottom-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#2D4B3E]" />
                    Ubah Foto
                  </button>
                )}
              </div>

              {/* Product Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D4B3E] block">
                    {product.code} • {product.category}
                  </span>
                  <h3 className="font-bold text-sm text-[#1B2E25] line-clamp-1 mt-0.5">{product.name}</h3>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {product.description || `Ikan asin ${product.name} pilihan dari ${product.origin || 'laut nusantara'}.`}
                  </p>
                  <div className="mt-2 text-xs font-black text-[#2D4B3E]">
                    {formatRupiah(product.pricePerKg)} <span className="text-[10px] text-gray-400 font-normal">/ kg</span>
                  </div>
                </div>

                {/* Packaging Weight selector */}
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                    <span>Pilih Takaran Kemasan:</span>
                    <span className="text-[#2D4B3E] font-black">{formatRupiah(cardPrice)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(['100g', '250g', '500g', '1kg'] as WeightOption[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedWeights((prev) => ({ ...prev, [product.id]: opt }))}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                          currentOption === opt ? 'btn-timbul-primary' : 'btn-timbul-white text-gray-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => handleAddToCart(product)}
                  className="w-full btn-timbul-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  + Tambah {currentOption} ({formatRupiah(cardPrice)})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Catalog Footer: Store Info, Delivery Notes & Staff Login */}
      <div className="mt-12 pt-8 border-t border-gray-200/80 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <span className="font-bold text-[#1B2E25] block mb-1">🌿 Kualitas & Higienis</span>
            <p className="leading-relaxed">Ikan asin pilihan hasil pengeringan higienis, bersih dari pasir dan debu, dengan cita rasa gurih alami.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <span className="font-bold text-[#1B2E25] block mb-1">📦 Pilihan Kemasan Fleksibel</span>
            <p className="leading-relaxed">Tersedia dalam kemasan 100g, 250g, 500g, hingga grosir 1 Kg dan bal-balan untuk kebutuhan warung & kuliner.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <span className="font-bold text-[#1B2E25] block mb-1">📲 Pesan Langsung via WhatsApp</span>
            <p className="leading-relaxed">Cukup klik pesan dan rincian belanja Anda otomatis terformat rapi dikirimkan langsung ke admin toko.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 pt-2 pb-6">
          <p>© {new Date().getFullYear()} {settings.storeName}. {settings.tagline}</p>

          {onOpenStaffLogin && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-gray-400 text-[11px]">Akses Pengelola:</span>
              <button
                id="staff-login-admin-btn"
                type="button"
                onClick={() => onOpenStaffLogin('owner')}
                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-gray-600 hover:text-[#2D4B3E] bg-gray-100 hover:bg-emerald-50 px-2 py-0.5 rounded border border-gray-200 transition-colors cursor-pointer"
                title="Login Admin / Owner (PIN: 1234)"
              >
                <Lock className="w-3 h-3 text-[#2D4B3E]" />
                /admin
              </button>
              <button
                id="staff-login-kasir-btn"
                type="button"
                onClick={() => onOpenStaffLogin('kasir')}
                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-gray-600 hover:text-[#2D4B3E] bg-gray-100 hover:bg-emerald-50 px-2 py-0.5 rounded border border-gray-200 transition-colors cursor-pointer"
                title="Login Kasir POS (PIN: 1111)"
              >
                /kasir
              </button>
              <button
                id="staff-login-staff-btn"
                type="button"
                onClick={() => onOpenStaffLogin('gudang')}
                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-gray-600 hover:text-[#2D4B3E] bg-gray-100 hover:bg-emerald-50 px-2 py-0.5 rounded border border-gray-200 transition-colors cursor-pointer"
                title="Login Staf Gudang (PIN: 2222)"
              >
                /staff
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Shopee-Style Sticky Bottom Bar on Mobile/Desktop */}
      {cartTotalItemCount > 0 && (
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#1B2E25] text-white p-3.5 rounded-2xl border-2 border-[#2D4B3E] shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-white">
                  <ShoppingBag className="w-6 h-6 text-emerald-300" />
                </div>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1B2E25]">
                  {cartTotalItemCount}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {cartTotalItemCount} Ikan ({formatWeight(cartTotalKg)})
                </p>
                <p className="text-sm font-black text-emerald-300">
                  {formatRupiah(cartTotal)}
                </p>
              </div>
            </div>

            <button
              id="open-cart-floating-btn"
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="btn-timbul-wa px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0"
            >
              Lihat Keranjang
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Shopee-Style Cart Drawer & Bottom Sheet Modal */}
      {isCartDrawerOpen && (
        <div
          id="shopee-cart-overlay"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsCartDrawerOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2d4b3e] flex items-center justify-center text-white">
                  <ShoppingBag className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Keranjang Pesanan Ikan Anda</h3>
                  <p className="text-xs text-gray-300">{cartTotalItemCount} Item Ikan Asin Pilihan</p>
                </div>
              </div>
              <button
                id="close-cart-drawer-btn"
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body: Cart Items & Customer Details */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAFAF8]">
              {/* Cart Items List */}
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Daftar Ikan Asin:</span>
                  {customerCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomerCart([])}
                      className="text-[11px] text-red-600 hover:text-red-800 font-bold"
                    >
                      Kosongkan Semua
                    </button>
                  )}
                </div>

                {customerCart.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30 text-gray-400" />
                    <p className="font-bold text-sm text-gray-700">Keranjang masih kosong</p>
                    <p className="text-xs text-gray-400 mt-0.5">Silakan pilih aneka ikan asin di katalog dan tambahkan ke keranjang.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 space-y-2">
                    {customerCart.map((item, idx) => {
                      const itemSubtotal = item.product.pricePerKg * item.quantityKg;
                      return (
                        <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-[#1B2E25] truncate">{item.product.name}</h4>
                            <p className="text-[11px] text-gray-500 font-medium">
                              Opsi: <span className="font-bold text-[#2D4B3E]">{item.option}</span> • Berat: {formatWeight(item.quantityKg)}
                            </p>
                            <p className="text-xs font-bold text-[#2D4B3E]">
                              {formatRupiah(itemSubtotal)}
                            </p>
                          </div>

                          {/* Quantity control & trash */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, -1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-300 font-bold text-xs flex items-center justify-center hover:bg-gray-200"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-6 text-center">{Math.round(item.quantityKg / getWeightInKg(item.option))}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-300 font-bold text-xs flex items-center justify-center hover:bg-gray-200"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-red-500 hover:text-red-700 ml-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer Input Info Form */}
              {customerCart.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-xs text-[#1B2E25] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#2D4B3E]" /> Data Pengiriman Pesanan
                  </h4>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nama Pemesan / Warung:</label>
                    <input
                      id="drawer-customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Ibu Siti / Rumah Makan Padang"
                      className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nomor WhatsApp / HP:</label>
                    <input
                      id="drawer-customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Alamat Pengiriman (Kecamatan, Kota):</label>
                    <textarea
                      id="drawer-customer-address"
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Contoh: Jl. Diponegoro No. 45, Cirebon"
                      className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E] resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Catatan Tambahan (Opsional):</label>
                    <input
                      id="drawer-customer-notes"
                      type="text"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Contoh: Minta yang packing kedap udara / kirim pagi"
                      className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-gray-300 rounded-xl focus:outline-none focus:border-[#2D4B3E]"
                    />
                  </div>

                  {/* Payment Method Selection for Customer */}
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <label className="text-xs font-bold text-gray-800 block">
                      Pilihan Metode Pembayaran ke Kasir:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreferredMethod('transfer');
                          setPreferredChannel('Bank BCA');
                        }}
                        className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                          preferredMethod === 'transfer'
                            ? 'border-[#2D4B3E] bg-[#E8F2EC] font-bold text-[#1B2E25]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-[#2D4B3E] shrink-0" />
                        <div>
                          <div className="font-bold leading-tight">Transfer Bank</div>
                          <div className="text-[10px] text-gray-500 font-normal">BCA / Mandiri / BRI / BNI</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreferredMethod('ewallet');
                          setPreferredChannel('DANA');
                        }}
                        className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                          preferredMethod === 'ewallet'
                            ? 'border-[#2D4B3E] bg-[#E8F2EC] font-bold text-[#1B2E25]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold leading-tight">E-Wallet</div>
                          <div className="text-[10px] text-gray-500 font-normal">DANA/GoPay/OVO</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreferredMethod('qris');
                          setPreferredChannel('QRIS AsinGo Official');
                        }}
                        className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                          preferredMethod === 'qris'
                            ? 'border-[#2D4B3E] bg-[#E8F2EC] font-bold text-[#1B2E25]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-bold leading-tight">QRIS Toko</div>
                          <div className="text-[10px] text-gray-500 font-normal">Scan Semua Bank</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreferredMethod('cash');
                          setPreferredChannel('Tunai Langsung / COD');
                        }}
                        className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                          preferredMethod === 'cash'
                            ? 'border-[#2D4B3E] bg-[#E8F2EC] font-bold text-[#1B2E25]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-bold leading-tight">Tunai / COD</div>
                          <div className="text-[10px] text-gray-500 font-normal">Bayar Kasir / COD</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline font-black">
                    <span className="text-xs text-gray-700">Total Estimasi ({formatWeight(cartTotalKg)}):</span>
                    <span className="text-lg text-[#234334]">{formatRupiah(cartTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="bg-white px-4 sm:px-5 py-3.5 sm:py-4 border-t border-gray-200 space-y-2.5 shrink-0">
              {/* Primary Action: Kirim Pesanan ke Kasir Toko */}
              <button
                id="send-order-to-cashier-btn"
                type="button"
                disabled={customerCart.length === 0 || isSubmittingOrder}
                onClick={handleSendOrderToCashier}
                className="w-full btn-timbul-primary py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 text-center tracking-wide disabled:opacity-40"
              >
                <Send className="w-4 h-4 text-emerald-300" />
                <span>
                  {isSubmittingOrder
                    ? 'Meneruskan Pesanan ke Kasir...'
                    : `KIRIM PESANAN KE KASIR TOKO • ${formatRupiah(cartTotal)}`}
                </span>
              </button>
              <p className="text-[11px] text-gray-500 text-center leading-tight">
                ⚡ Pesanan langsung masuk ke sistem Kasir secara real-time untuk konfirmasi pembayaran & stok.
              </p>

              {/* Secondary Option: WhatsApp */}
              <button
                id="send-wa-order-cart-btn"
                type="button"
                disabled={customerCart.length === 0}
                onClick={handleSendOrderWhatsApp}
                className="w-full btn-timbul-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-center text-gray-700 hover:text-emerald-700"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Pesan Cepat via WhatsApp Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="w-full py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 text-center"
              >
                Lanjut Belanja / Tambah Ikan Lain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tabel Daftar Harga Lengkap (19 Jenis) */}
      {showPriceTableModal && (
        <div id="price-table-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#1b2e25] px-4 sm:px-6 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Tabel Daftar Harga Ikan Asin</h3>
                  <p className="text-xs text-emerald-200/80">Daftar harga resmi 250 Gram, 500 Gram, dan 1 Kg</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPriceTableModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subheader info */}
            <div className="bg-[#F2F7F4] px-4 sm:px-6 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1B2E25]">Toko: {settings.storeName}</span>
                <span className="text-gray-400">•</span>
                <span className="font-mono text-[#2D4B3E] font-semibold">WA: {settings.ownerWaNumber}</span>
              </div>
              <span className="bg-emerald-100 text-[#1B2E25] font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                {products.length} Jenis Ikan Asin Tersedia
              </span>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto p-3 sm:p-5">
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1b2e25] text-white">
                      <th className="py-3 px-3 font-bold text-center w-12 border-b border-[#2d4b3e]">No</th>
                      <th className="py-3 px-3 font-bold border-b border-[#2d4b3e]">Jenis Ikan Asin</th>
                      <th className="py-3 px-3 font-bold text-right border-b border-[#2d4b3e]">Harga/Kg</th>
                      <th className="py-3 px-3 font-bold text-center border-b border-[#2d4b3e] bg-[#234334]">250 Gram</th>
                      <th className="py-3 px-3 font-bold text-center border-b border-[#2d4b3e]">500 Gram</th>
                      <th className="py-3 px-3 font-bold text-center border-b border-[#2d4b3e] bg-[#234334]">1 Kg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-800">
                    {products.map((p, idx) => {
                      const p250 = Math.round(p.pricePerKg * 0.25);
                      const p500 = Math.round(p.pricePerKg * 0.5);
                      const p1kg = p.pricePerKg;
                      const isAvailable = p.currentStockKg > 0;

                      return (
                        <tr key={p.id} className="hover:bg-[#F8FAF9] transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-gray-500">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-200"
                              />
                              <div>
                                <span className="font-bold text-[#1B2E25] block text-xs sm:text-sm">{p.name}</span>
                                <span className="text-[10px] text-gray-500">{p.origin || p.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[#2D4B3E]">
                            {formatRupiah(p.pricePerKg)}
                          </td>
                          {/* 250 Gram */}
                          <td className="py-3 px-3 text-center bg-[#F8FAF9]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold text-gray-900">{formatRupiah(p250)}</span>
                              <button
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => {
                                  setSelectedWeights((prev) => ({ ...prev, [p.id]: '250g' }));
                                  setCustomerCart((prev) => {
                                    const existing = prev.find((item) => item.product.id === p.id && item.option === '250g');
                                    if (existing) {
                                      return prev.map((item) =>
                                        item.product.id === p.id && item.option === '250g'
                                          ? { ...item, quantityKg: Number((item.quantityKg + 0.25).toFixed(2)) }
                                          : item
                                      );
                                    }
                                    return [...prev, { product: p, quantityKg: 0.25, option: '250g' }];
                                  });
                                  setToastAdded(`${p.name} (250g) ditambahkan ke keranjang`);
                                  setTimeout(() => setToastAdded(null), 2500);
                                }}
                                className="btn-timbul-primary px-2 py-0.5 rounded text-[10px] font-bold disabled:opacity-40"
                              >
                                + Pesan
                              </button>
                            </div>
                          </td>
                          {/* 500 Gram */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold text-gray-900">{formatRupiah(p500)}</span>
                              <button
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => {
                                  setSelectedWeights((prev) => ({ ...prev, [p.id]: '500g' }));
                                  setCustomerCart((prev) => {
                                    const existing = prev.find((item) => item.product.id === p.id && item.option === '500g');
                                    if (existing) {
                                      return prev.map((item) =>
                                        item.product.id === p.id && item.option === '500g'
                                          ? { ...item, quantityKg: Number((item.quantityKg + 0.5).toFixed(2)) }
                                          : item
                                      );
                                    }
                                    return [...prev, { product: p, quantityKg: 0.5, option: '500g' }];
                                  });
                                  setToastAdded(`${p.name} (500g) ditambahkan ke keranjang`);
                                  setTimeout(() => setToastAdded(null), 2500);
                                }}
                                className="btn-timbul-primary px-2 py-0.5 rounded text-[10px] font-bold disabled:opacity-40"
                              >
                                + Pesan
                              </button>
                            </div>
                          </td>
                          {/* 1 Kg */}
                          <td className="py-3 px-3 text-center bg-[#F8FAF9]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold text-gray-900">{formatRupiah(p1kg)}</span>
                              <button
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => {
                                  setSelectedWeights((prev) => ({ ...prev, [p.id]: '1kg' }));
                                  setCustomerCart((prev) => {
                                    const existing = prev.find((item) => item.product.id === p.id && item.option === '1kg');
                                    if (existing) {
                                      return prev.map((item) =>
                                        item.product.id === p.id && item.option === '1kg'
                                          ? { ...item, quantityKg: Number((item.quantityKg + 1.0).toFixed(2)) }
                                          : item
                                      );
                                    }
                                    return [...prev, { product: p, quantityKg: 1.0, option: '1kg' }];
                                  });
                                  setToastAdded(`${p.name} (1 Kg) ditambahkan ke keranjang`);
                                  setTimeout(() => setToastAdded(null), 2500);
                                }}
                                className="btn-timbul-primary px-2 py-0.5 rounded text-[10px] font-bold disabled:opacity-40"
                              >
                                + Pesan
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white p-4 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                * Klik tombol <strong className="text-gray-700">+ Pesan</strong> untuk memasukkan pilihan takaran ke keranjang belanja.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPriceTableModal(false);
                    if (cartTotalItemCount > 0) {
                      setIsCartDrawerOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto btn-timbul-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Lihat Keranjang Belanja ({cartTotalItemCount})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Active Order Status Bar if customer has made an order */}
      {activeCustomerOrder && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-lg bg-[#1B2E25] text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-400 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeCustomerOrder.paymentStatus === 'paid' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {activeCustomerOrder.paymentStatus === 'paid' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4 animate-spin" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate">
                Pesanan #{activeCustomerOrder.invoiceNumber}
              </div>
              <div className="text-[11px] text-gray-300 truncate">
                {activeCustomerOrder.paymentStatus === 'paid' ? (
                  <span className="text-emerald-300 font-bold">LUNAS Dikonfirmasi Kasir!</span>
                ) : (
                  <span className="text-amber-300">Menunggu Pembayaran & Konfirmasi Kasir</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className="btn-timbul-white px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 text-gray-800 flex items-center gap-1"
          >
            <span>Lihat Status</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Customer Order Status & Payment Guide Modal */}
      <CustomerOrderStatusModal
        order={activeCustomerOrder}
        settings={settings}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </div>
  );
};
