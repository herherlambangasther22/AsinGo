import React, { useState } from 'react';
import { Order, Product, StoreSettings } from '../types';
import { formatRupiah, formatWeight } from '../lib/exportUtils';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  CreditCard,
  QrCode,
  Banknote,
  Award,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface AnalyticsDashboardProps {
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  orders,
  products,
  settings,
}) => {
  const [timeRange, setTimeRange] = useState<'30days' | '7days' | 'all'>('30days');

  // Filter orders based on time range
  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (timeRange === 'all') return true;
    const orderDate = new Date(o.createdAt);
    const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
    if (timeRange === '7days') return diffDays <= 7;
    if (timeRange === '30days') return diffDays <= 30;
    return true;
  });

  const totalOmzet = filteredOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const totalVolumeKg = filteredOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.quantityKg, 0),
    0
  );
  const avgOrderValue = filteredOrders.length > 0 ? Math.round(totalOmzet / filteredOrders.length) : 0;

  // Group by date for Bar Chart
  const dateMap: { [date: string]: { date: string; omzet: number; kg: number } } = {};
  filteredOrders.forEach((o) => {
    const d = o.createdAt.split('T')[0];
    const shortDate = d.slice(5); // MM-DD
    if (!dateMap[shortDate]) {
      dateMap[shortDate] = { date: shortDate, omzet: 0, kg: 0 };
    }
    dateMap[shortDate].omzet += o.finalTotal;
    dateMap[shortDate].kg += o.items.reduce((s, it) => s + it.quantityKg, 0);
  });
  const chartData = Object.values(dateMap).slice(-14); // last 14 active days

  // Best Selling Products
  const productSalesMap: { [name: string]: { name: string; qty: number; total: number } } = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((it) => {
      if (!productSalesMap[it.productName]) {
        productSalesMap[it.productName] = { name: it.productName, qty: 0, total: 0 };
      }
      productSalesMap[it.productName].qty += it.quantityKg;
      productSalesMap[it.productName].total += it.subtotal;
    });
  });
  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Payment method distribution for Pie Chart
  const paymentCounts = {
    Tunai: filteredOrders.filter((o) => o.paymentMethod === 'cash').length,
    QRIS: filteredOrders.filter((o) => o.paymentMethod === 'qris').length,
    Transfer: filteredOrders.filter((o) => o.paymentMethod === 'transfer').length,
  };
  const pieData = [
    { name: 'Tunai', value: paymentCounts.Tunai, color: '#15803D' },
    { name: 'QRIS', value: paymentCounts.QRIS, color: '#2563EB' },
    { name: 'Transfer', value: paymentCounts.Transfer, color: '#D97706' },
  ].filter((p) => p.value > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header with Filter - Clean Flat */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1b2e25] text-white flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-[#1B2E25]">Analitik &amp; Performa Penjualan</h2>
            <p className="text-xs text-gray-500">
              Insight komprehensif omzet, volume ikan, dan tren transaksi
            </p>
          </div>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-[#F2F7F4] p-1 rounded-xl border border-gray-300">
          {(['7days', '30days', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === r
                  ? 'btn-timbul-primary'
                  : 'btn-timbul-white text-gray-700'
              }`}
            >
              {r === '7days' ? '7 Hari Terakhir' : r === '30days' ? '30 Hari Terakhir' : 'Semua Riwayat'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards - Clean Flat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Omzet</span>
            <DollarSign className="w-4 h-4 text-[#2D4B3E]" />
          </div>
          <span className="font-black text-2xl text-[#1B2E25] block mt-2">
            {formatRupiah(totalOmzet)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {filteredOrders.length} Transaksi Selesai
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Volume Ikan Terjual</span>
            <ShoppingBag className="w-4 h-4 text-[#2D4B3E]" />
          </div>
          <span className="font-black text-2xl text-[#1B2E25] block mt-2">
            {formatWeight(totalVolumeKg)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Rata-rata {formatWeight(filteredOrders.length > 0 ? totalVolumeKg / filteredOrders.length : 0)} / nota
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Rata-rata Nota (AOV)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-black text-2xl text-gray-900 block mt-2">
            {formatRupiah(avgOrderValue)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">Nilai belanja per transaksi</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
            <span>Pelanggan Terlayani</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-black text-2xl text-gray-900 block mt-2">
            {new Set(filteredOrders.map((o) => o.customerName)).size} Orang
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">Tercatat di sistem</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Omzet Trend Bar Chart (8 cols) - Clean Flat */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#1B2E25]">Tren Pendapatan Harian (Rp)</h3>
              <p className="text-xs text-gray-500">Pergerakan omzet per tanggal aktif</p>
            </div>
            <span className="text-xs font-bold text-[#2D4B3E] bg-[#E2EDE7] px-2 py-0.5 rounded">
              Grafik Bar
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                Belum ada data untuk periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#6B7280" />
                  <YAxis
                    tickFormatter={(val) => `${val / 1000}k`}
                    tick={{ fontSize: 11 }}
                    stroke="#6B7280"
                  />
                  <Tooltip
                    formatter={(value: any) => [formatRupiah(Number(value)), 'Omzet']}
                    labelFormatter={(label) => `Tanggal: ${label}`}
                  />
                  <Bar dataKey="omzet" fill="#234334" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Distribution Pie Chart (4 cols) - Clean Flat */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#1B2E25]">Proporsi Metode Bayar</h3>
            <p className="text-xs text-gray-500">Tunai vs Non-Tunai (QRIS &amp; Transfer)</p>
          </div>

          <div className="h-48 w-full">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                Belum ada data pembayaran
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} transaksi`, 'Jumlah']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-200 text-center text-xs">
            <div>
              <span className="text-[10px] text-gray-500 block">Tunai</span>
              <span className="font-bold text-emerald-700">{paymentCounts.Tunai}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block">QRIS</span>
              <span className="font-bold text-blue-700">{paymentCounts.QRIS}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block">Transfer</span>
              <span className="font-bold text-amber-700">{paymentCounts.Transfer}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Products List - Clean Flat */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-sm text-[#1B2E25]">5 Ikan Asin Paling Laris (Top Sellers)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {topProducts.map((p, idx) => (
            <div
              key={idx}
              className="bg-[#FAFAF8] p-3.5 rounded-xl border border-gray-200 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black bg-[#1b2e25] text-white px-2 py-0.5 rounded">
                  #{idx + 1}
                </span>
                <span className="font-black text-xs text-[#2D4B3E]">{formatWeight(p.qty)}</span>
              </div>
              <h4 className="font-bold text-xs text-gray-900 line-clamp-1 pt-1">{p.name}</h4>
              <p className="text-[11px] text-gray-500 font-semibold">{formatRupiah(p.total)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
