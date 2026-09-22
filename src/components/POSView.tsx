import React, { useState } from 'react';
import { Product, CartItem, Order, User, StoreSettings, WeightOption } from '../types';
import { formatRupiah, formatWeight } from '../lib/exportUtils';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Camera,
  ShoppingBag,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  CheckCircle,
  AlertTriangle,
  User as UserIcon,
  Phone,
  StickyNote,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface POSViewProps {
  products: Product[];
  currentUser: User;
  settings: StoreSettings;
  onOpenImageModal: (product: Product) => void;
  onCreateOrder: (order: Partial<Order>) => Promise<Order | null>;
  onOrderSuccess: (order: Order) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  currentUser,
  settings,
  onOpenImageModal,
  onCreateOrder,
  onOrderSuccess,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Pelanggan Umum');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showQrisPreview, setShowQrisPreview] = useState<boolean>(false);

  // Weight selector states per product
  const [selectedWeights, setSelectedWeights] = useState<{ [productId: string]: { option: WeightOption; customKg: number } }>({});

  const categories = ['Semua', 'Teri & Bilis', 'Ikan Kering Belah', 'Jambal & Gabus', 'Cumi & Seafood', 'Ikan Air Tawar & Sungai', 'Bal-balan & Grosir'];

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.origin && p.origin.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getWeightInKg = (productId: string): { option: WeightOption; kg: number } => {
    const state = selectedWeights[productId] || { option: '1kg', customKg: 1 };
    switch (state.option) {
      case '100g':
        return { option: '100g', kg: 0.1 };
      case '250g':
        return { option: '250g', kg: 0.25 };
      case '500g':
        return { option: '500g', kg: 0.5 };
      case '1kg':
        return { option: '1kg', kg: 1.0 };
      case '5kg':
        return { option: '5kg', kg: 5.0 };
      case '10kg':
        return { option: '10kg', kg: 10.0 };
      case 'custom':
        return { option: 'custom', kg: state.customKg || 1 };
    }
  };

  const setProductWeightOption = (productId: string, option: WeightOption, customKg?: number) => {
    setSelectedWeights((prev) => ({
      ...prev,
      [productId]: { option, customKg: customKg !== undefined ? customKg : prev[productId]?.customKg || 1 },
    }));
  };

  // Add to cart
  const handleAddToCart = (product: Product) => {
    const { option, kg } = getWeightInKg(product.id);
    if (kg <= 0) return;

    // Check stock
    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    const currentInCart = existingIndex >= 0 ? cart[existingIndex].quantityKg : 0;
    if (currentInCart + kg > product.currentStockKg) {
      alert(`Stok ${product.name} tidak mencukupi! Tersedia hanya ${product.currentStockKg} kg`);
      return;
    }

    const calculatedPrice = Math.round(product.pricePerKg * kg);

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      const newQty = Number((updatedCart[existingIndex].quantityKg + kg).toFixed(2));
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantityKg: newQty,
        calculatedPrice: Math.round(product.pricePerKg * newQty),
      };
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          product,
          weightOption: option,
          quantityKg: kg,
          calculatedPrice,
        },
      ]);
    }
  };

  const handleUpdateCartQty = (index: number, change: number) => {
    const updated = [...cart];
    const item = updated[index];
    const newQty = Number((item.quantityKg + change).toFixed(2));

    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }

    if (newQty > item.product.currentStockKg) {
      alert(`Maksimal stok tersedia hanya ${item.product.currentStockKg} kg`);
      return;
    }

    item.quantityKg = newQty;
    item.calculatedPrice = Math.round(item.product.pricePerKg * newQty);
    setCart(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Kosongkan semua item dalam keranjang?')) {
      setCart([]);
      setDiscountAmount(0);
      setCashGiven(0);
    }
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.calculatedPrice, 0);
  const totalWeightKg = cart.reduce((sum, item) => sum + item.quantityKg, 0);
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const change = Math.max(0, cashGiven - finalTotal);

  // Set default cash given
  const setExactCash = () => {
    setCashGiven(finalTotal);
  };

  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      alert('Keranjang masih kosong!');
      return;
    }

    if (paymentMethod === 'cash' && cashGiven < finalTotal) {
      alert('Uang pembayaran tunai kurang dari total tagihan!');
      return;
    }

    setIsProcessing(true);

    try {
      const orderPayload: Partial<Order> = {
        cashierName: currentUser.name,
        cashierRole: currentUser.role,
        customerName: customerName.trim() || 'Pelanggan Umum',
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((c) => ({
          productId: c.productId,
          productName: c.product.name,
          quantityKg: c.quantityKg,
          pricePerKg: c.product.pricePerKg,
          subtotal: c.calculatedPrice,
          notes: c.notes,
        })),
        subtotal,
        discount: discountAmount,
        finalTotal,
        paymentMethod,
        paymentStatus: 'paid',
        cashGiven: paymentMethod === 'cash' ? cashGiven : undefined,
        change: paymentMethod === 'cash' ? change : undefined,
        notes: orderNotes.trim() || undefined,
      };

      const createdOrder = await onCreateOrder(orderPayload);

      if (createdOrder) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2D4B3E', '#15803D', '#F59E0B', '#FFFFFF'],
        });

        // Clear cart
        setCart([]);
        setDiscountAmount(0);
        setCashGiven(0);
        setCustomerName('Pelanggan Umum');
        setCustomerPhone('');
        setOrderNotes('');

        // Open Receipt Modal
        onOrderSuccess(createdOrder);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memproses pesanan');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Product Catalog & Fast Weight Selector (7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="pos-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ikan asin (Teri Medan, Jambal Roti, Peda, Cumi...)"
                className="w-full pl-10 pr-4 py-2 bg-[#F8FAF9] border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#2D4B3E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  id={`cat-btn-${cat}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'btn-timbul-primary'
                      : 'btn-timbul-white text-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const { option: selectedOpt, kg: currentKg } = getWeightInKg(product.id);
              const cardPrice = Math.round(product.pricePerKg * currentKg);
              const isLowStock = product.currentStockKg <= product.minStockKg;
              const isOutOfStock = product.currentStockKg <= 0;

              return (
                <div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:border-[#2D4B3E]"
                >
                  {/* Card Image Area with Change Photo Trigger */}
                  <div className="relative h-40 bg-gray-100 overflow-hidden group">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Badge Category & Grade */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="bg-[#1b2e25] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        {product.code}
                      </span>
                      {product.qualityGrade && (
                        <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                          {product.qualityGrade}
                        </span>
                      )}
                    </div>

                    {/* Stock status overlay badge */}
                    <div className="absolute top-2 right-2">
                      {isOutOfStock ? (
                        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
                          HABIS
                        </span>
                      ) : isLowStock ? (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Sisa {formatWeight(product.currentStockKg)}
                        </span>
                      ) : (
                        <span className="bg-[#1b2e25] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                          Stok: {formatWeight(product.currentStockKg)}
                        </span>
                      )}
                    </div>

                    {/* Change Photo Button */}
                    <button
                      id={`change-photo-btn-${product.id}`}
                      type="button"
                      onClick={() => onOpenImageModal(product)}
                      className="btn-timbul-white absolute bottom-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#2D4B3E]" />
                      Ubah Foto
                    </button>
                  </div>

                  {/* Card Content & Weight Options */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#1B2E25] line-clamp-1">{product.name}</h3>
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                        <span>{product.origin || 'Kualitas Terjamin'}</span>
                        <span className="font-bold text-[#2D4B3E]">{formatRupiah(product.pricePerKg)} / kg</span>
                      </div>
                    </div>

                    {/* Fast Weight Selector Chips */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                        <span>Pilih Takaran Berat:</span>
                        <span className="font-bold text-[#2D4B3E]">{formatWeight(currentKg)}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        {(['100g', '250g', '500g', '1kg'] as WeightOption[]).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setProductWeightOption(product.id, opt)}
                            className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                              selectedOpt === opt
                                ? 'btn-timbul-primary'
                                : 'btn-timbul-white text-gray-700'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {/* Bulk / Custom options row */}
                      <div className="grid grid-cols-3 gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setProductWeightOption(product.id, '5kg')}
                          className={`py-0.5 text-[10px] font-bold rounded-md transition-all ${
                            selectedOpt === '5kg'
                              ? 'btn-timbul-primary'
                              : 'btn-timbul-white text-gray-600'
                          }`}
                        >
                          Bal 5 kg
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductWeightOption(product.id, '10kg')}
                          className={`py-0.5 text-[10px] font-bold rounded-md transition-all ${
                            selectedOpt === '10kg'
                              ? 'btn-timbul-primary'
                              : 'btn-timbul-white text-gray-600'
                          }`}
                        >
                          Bal 10 kg
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const customInput = prompt('Masukkan berat timbangan custom (dalam Kg):', '1.5');
                            if (customInput && !isNaN(Number(customInput))) {
                              setProductWeightOption(product.id, 'custom', Number(customInput));
                            }
                          }}
                          className={`py-0.5 text-[10px] font-bold rounded-md transition-all ${
                            selectedOpt === 'custom'
                              ? 'btn-timbul-primary'
                              : 'btn-timbul-white text-gray-600'
                          }`}
                        >
                          Custom Kg
                        </button>
                      </div>
                    </div>

                    {/* Add to Order Button */}
                    <button
                      id={`add-to-cart-btn-${product.id}`}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleAddToCart(product)}
                      className="w-full btn-timbul-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      + Tambah {formatWeight(currentKg)} ({formatRupiah(cardPrice)})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: POS Billing Register & Fast Checkout (5 cols on lg, 4 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden flex flex-col">
            {/* Header POS Cart */}
            <div className="bg-[#1b2e25] px-4 py-3.5 text-white flex items-center justify-between border-b border-[#2d4b3e]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-300" />
                <div>
                  <h2 className="font-bold text-sm leading-tight">Nota Penjualan Kasir</h2>
                  <p className="text-[11px] text-gray-300">
                    Kasir: <span className="font-bold text-white">{currentUser.name}</span>
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  id="clear-cart-btn"
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs font-bold text-rose-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Batal
                </button>
              )}
            </div>

            {/* Customer Details Form (Collapsible/Simple) */}
            <div className="p-3 bg-[#F8FAF9] border-b border-gray-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase flex items-center gap-1 mb-0.5">
                  <UserIcon className="w-3 h-3 text-[#2D4B3E]" /> Nama Pembeli:
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Pelanggan Umum..."
                  className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E] font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase flex items-center gap-1 mb-0.5">
                  <Phone className="w-3 h-3 text-[#2D4B3E]" /> WhatsApp (Opsional):
                </label>
                <input
                  id="customer-phone-input"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08123456789..."
                  className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#2D4B3E] font-medium"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-3 max-h-56 overflow-y-auto space-y-2 divide-y divide-gray-100">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#2D4B3E]" />
                  <p className="font-bold text-xs text-gray-600">Keranjang Belanja Masih Kosong</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Pilih ikan asin dan klik "+ Tambah" di samping kiri
                  </p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-[#1B2E25] truncate">{item.product.name}</h4>
                        <p className="text-[11px] text-gray-500">
                          {formatRupiah(item.product.pricePerKg)} / kg
                        </p>
                      </div>
                    </div>

                    {/* Qty +/- and Price */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-[#F2F7F4] border border-gray-300 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(index, -0.25)}
                          className="w-5 h-5 rounded flex items-center justify-center bg-white text-gray-700 hover:bg-gray-100 font-bold text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-bold text-xs text-[#2D4B3E]">
                          {formatWeight(item.quantityKg)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(index, 0.25)}
                          className="w-5 h-5 rounded flex items-center justify-center bg-white text-gray-700 hover:bg-gray-100 font-bold text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-bold text-xs text-[#1B2E25] w-20 text-right">
                        {formatRupiah(item.calculatedPrice)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Discounts */}
            <div className="p-3 bg-[#F8FAF9] border-t border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between font-medium text-gray-600">
                <span>Subtotal ({formatWeight(totalWeightKg)}):</span>
                <span className="font-bold text-gray-900">{formatRupiah(subtotal)}</span>
              </div>

              {/* Discount Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-600 font-medium flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-600" /> Diskon (Rp):
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDiscountAmount(5000)}
                    className="btn-timbul-white px-2 py-0.5 text-[10px] rounded"
                  >
                    5rb
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountAmount(10000)}
                    className="btn-timbul-white px-2 py-0.5 text-[10px] rounded"
                  >
                    10rb
                  </button>
                  <input
                    id="discount-input"
                    type="number"
                    min="0"
                    step="1000"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 px-2 py-0.5 text-right font-bold text-xs border border-gray-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Total Tagihan */}
              <div className="pt-2 border-t border-dashed border-gray-300 flex justify-between items-baseline font-black">
                <span className="text-xs text-gray-700">TOTAL TAGIHAN:</span>
                <span className="text-xl text-[#234334]">{formatRupiah(finalTotal)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-3 border-t border-gray-200 space-y-2">
              <span className="text-[11px] font-bold text-gray-700 block">Metode Pembayaran:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  id="pay-cash-btn"
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'cash'
                      ? 'btn-timbul-primary'
                      : 'btn-timbul-white text-gray-700'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Tunai
                </button>

                <button
                  id="pay-qris-btn"
                  type="button"
                  onClick={() => {
                    setPaymentMethod('qris');
                    setShowQrisPreview(true);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'qris'
                      ? 'btn-timbul-primary'
                      : 'btn-timbul-white text-gray-700'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  QRIS
                </button>

                <button
                  id="pay-transfer-btn"
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'transfer'
                      ? 'btn-timbul-primary'
                      : 'btn-timbul-white text-gray-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Transfer
                </button>
              </div>

              {/* Cash Input & Quick Money Chips */}
              {paymentMethod === 'cash' && (
                <div className="pt-2 space-y-2 bg-[#F8FAF9] p-2.5 rounded-xl border border-gray-200 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-gray-700">Uang Tunai Diterima:</span>
                    <input
                      id="cash-given-input"
                      type="number"
                      step="1000"
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(Number(e.target.value))}
                      placeholder="0"
                      className="w-28 px-2 py-1 text-right font-black text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#2D4B3E]"
                    />
                  </div>

                  {/* Quick Money Buttons */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <button
                      type="button"
                      onClick={setExactCash}
                      className="btn-timbul-white px-2 py-1 text-[10px] rounded-lg"
                    >
                      Uang Pas
                    </button>
                    {[50000, 100000, 200000, 500000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setCashGiven(nominal)}
                        className="btn-timbul-white px-2 py-1 text-[10px] rounded-lg"
                      >
                        {nominal / 1000}rb
                      </button>
                    ))}
                  </div>

                  {/* Kembalian */}
                  <div className="pt-1.5 border-t border-gray-200 flex justify-between items-baseline">
                    <span className="font-bold text-gray-600">Kembalian:</span>
                    <span
                      className={`font-black text-sm ${
                        cashGiven >= finalTotal ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {cashGiven >= finalTotal
                        ? formatRupiah(change)
                        : `Kurang ${formatRupiah(finalTotal - cashGiven)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS / Transfer Preview Box */}
              {paymentMethod === 'qris' && showQrisPreview && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-1">
                  <QrCode className="w-12 h-12 mx-auto text-blue-800" />
                  <p className="font-bold text-xs text-blue-900">QRIS AsinGo Siap di-Scan</p>
                  <p className="text-[11px] text-blue-700">Total: {formatRupiah(finalTotal)} (Bebas Biaya Admin)</p>
                </div>
              )}

              {paymentMethod === 'transfer' && (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-0.5">
                  <p className="font-bold text-gray-800">Rekening Transfer Toko:</p>
                  <p className="text-gray-600 font-mono text-[11px]">BCA: 8820-1234-5678 (a/n AsinGo)</p>
                  <p className="text-gray-600 font-mono text-[11px]">Mandiri: 132-00-998877-6</p>
                </div>
              )}
            </div>

            {/* Note input */}
            <div className="px-3 pb-2">
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Catatan pesanan (opsional)..."
                className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white"
              />
            </div>

            {/* Process Checkout Button with Strong Raised Tactile Presence */}
            <div className="p-3 bg-white border-t border-gray-200">
              <button
                id="process-checkout-btn"
                type="button"
                disabled={isProcessing || cart.length === 0}
                onClick={handleProcessCheckout}
                className="w-full btn-timbul-primary py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                {isProcessing
                  ? 'Memproses Transaksi...'
                  : `BAYAR SEKARANG • ${formatRupiah(finalTotal)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
