import React from 'react';
import { User, StoreSettings, Product } from '../types';
import {
  ShoppingBag,
  Boxes,
  FileSpreadsheet,
  BarChart3,
  AlertTriangle,
  Store,
  Menu,
  X,
  User as UserIcon,
  Settings,
  LogOut,
  Lock,
  Database,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'pos' | 'stock' | 'daily' | 'analytics' | 'catalog' | 'backup';
  setCurrentTab: (tab: 'pos' | 'stock' | 'daily' | 'analytics' | 'catalog' | 'backup') => void;
  currentUser: User;
  onOpenRoleModal: () => void;
  onOpenLowStockModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenCustomerProfile: () => void;
  onOpenCartDrawer: () => void;
  onLogoutToCustomer?: () => void;
  cartItemCount: number;
  products: Product[];
  settings: StoreSettings;
  isRealtimeConnected: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  pendingWebOrdersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenRoleModal,
  onOpenLowStockModal,
  onOpenSettingsModal,
  onOpenCustomerProfile,
  onOpenCartDrawer,
  onLogoutToCustomer,
  cartItemCount,
  products,
  settings,
  isRealtimeConnected,
  mobileMenuOpen,
  setMobileMenuOpen,
  pendingWebOrdersCount = 0,
}) => {
  const lowStockCount = products.filter((p) => p.currentStockKg <= p.minStockKg).length;

  // Filter allowed tabs based on role
  const isOwner = currentUser.role === 'owner';
  const isKasir = currentUser.role === 'kasir' || isOwner;
  const isGudang = currentUser.role === 'gudang' || isOwner;
  const isPelanggan = currentUser.role === 'pelanggan';

  const navItems = [
    { id: 'pos', label: 'Kasir (POS)', icon: ShoppingBag, show: isKasir && !isPelanggan },
    { id: 'catalog', label: 'Katalog Ikan', icon: Store, show: true },
    { id: 'stock', label: 'Manajemen Stok', icon: Boxes, show: isGudang && !isPelanggan },
    { id: 'daily', label: 'Laporan WA & Harian', icon: FileSpreadsheet, show: isKasir && !isPelanggan },
    { id: 'analytics', label: 'Analitik Bulanan', icon: BarChart3, show: isOwner && !isPelanggan },
    { id: 'backup', label: 'Backup & Restore', icon: Database, show: isOwner && !isPelanggan },
  ].filter((item) => item.show);

  return (
    <header className="sticky top-0 z-40 bg-[#1b2e25] text-white border-b border-[#2d4b3e] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Store Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentTab(isPelanggan ? 'catalog' : 'pos')}
              className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#2d4b3e] shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center p-1 overflow-hidden shrink-0">
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
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl tracking-tight text-white">{settings.storeName}</span>
                </div>
                <p className="text-[10px] text-[#A8BEAE] font-medium leading-none hidden sm:block">
                  Pemesanan &amp; Stok Ikan Asin Pilihan
                </p>
              </div>
            </button>
          </div>

          {/* Desktop & Tablet Navigation Tabs (Staff Only) */}
          {!isPelanggan && navItems.length > 1 && (
            <nav className="hidden lg:flex items-center gap-1 bg-[#12221b] p-1 rounded-xl border border-[#2d4b3e]">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    type="button"
                    onClick={() => setCurrentTab(item.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-white text-[#1b2e25] shadow-sm'
                        : 'text-[#c1d6cc] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.id === 'pos' && pendingWebOrdersCount > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                        {pendingWebOrdersCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Header Actions: Distinct for Pelanggan vs Staff */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isPelanggan ? (
              /* CUSTOMER HEADER ACTIONS: Shopee Cart Icon + Customer Profile Icon */
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Shopee-style Cart Icon with Badge */}
                <button
                  id="customer-cart-header-btn"
                  type="button"
                  onClick={onOpenCartDrawer}
                  title="Buka Keranjang Belanja"
                  className="relative p-2.5 rounded-xl bg-[#12221b] border border-[#2d4b3e] text-white hover:bg-[#2d4b3e] transition-colors cursor-pointer flex items-center justify-center group"
                >
                  <ShoppingBag className="w-5 h-5 text-emerald-300 group-hover:scale-110 transition-transform" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-[#1b2e25] animate-pulse">
                      {cartItemCount}
                    </span>
                  )}
                </button>

                {/* Customer Profile Icon */}
                <button
                  id="customer-profile-header-btn"
                  type="button"
                  onClick={onOpenCustomerProfile}
                  title="Profil & Data Pengiriman"
                  className="btn-timbul-white flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#2D4B3E] flex items-center justify-center text-white shrink-0">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                  <span className="font-bold text-xs">Profil Pembeli</span>
                </button>
              </div>
            ) : (
              /* STAFF HEADER ACTIONS: Low Stock + Settings + Staff User Switcher */
              <div className="flex items-center gap-2">
                {/* Settings Button (Owner only) */}
                {isOwner && (
                  <button
                    id="open-settings-btn"
                    type="button"
                    onClick={onOpenSettingsModal}
                    title="Pengaturan Toko & WhatsApp"
                    className="p-2 rounded-xl bg-[#12221b] border border-[#2d4b3e] text-white hover:bg-[#2d4b3e] transition-colors cursor-pointer"
                  >
                    <Settings className="w-5 h-5 text-[#c1d6cc]" />
                  </button>
                )}

                {/* Low Stock Alert Bell */}
                <button
                  id="low-stock-bell-btn"
                  type="button"
                  onClick={onOpenLowStockModal}
                  title="Peringatan Stok Menipis"
                  className="relative p-2 rounded-xl bg-[#12221b] border border-[#2d4b3e] text-white hover:bg-[#2d4b3e] transition-colors cursor-pointer"
                >
                  <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? 'text-amber-300 animate-bounce' : 'text-[#c1d6cc]'}`} />
                  {lowStockCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1b2e25]">
                      {lowStockCount}
                    </span>
                  )}
                </button>

                {/* Staff User Role Switcher Button */}
                <button
                  id="user-role-header-btn"
                  type="button"
                  onClick={onOpenRoleModal}
                  className="btn-timbul-white flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: currentUser.avatarColor || '#2D4B3E' }}
                  >
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline font-bold truncate max-w-[110px]">{currentUser.name}</span>
                  <span className="text-[10px] bg-[#E2EDE7] text-[#1b2e25] font-bold px-1.5 py-0.2 rounded uppercase">
                    {currentUser.role === 'owner' ? 'Admin' : currentUser.role}
                  </span>
                </button>

                {/* Quick Lock / Logout to Customer View Button */}
                {onLogoutToCustomer && (
                  <button
                    id="lock-to-customer-header-btn"
                    type="button"
                    onClick={onLogoutToCustomer}
                    title="Kunci & Keluar ke Mode Pembeli Publik"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Mode Pembeli</span>
                  </button>
                )}

                {/* Mobile Hamburger Toggle (Staff Only) */}
                <button
                  id="mobile-menu-toggle-btn"
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl bg-[#12221b] border border-[#2d4b3e] text-white"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu for Staff */}
      {!isPelanggan && mobileMenuOpen && (
        <div className="lg:hidden bg-[#12221b] border-t border-[#2d4b3e] px-4 pt-3 pb-4 space-y-2">
          <div className="pb-2 border-b border-[#2d4b3e]">
            <span className="text-xs text-[#c1d6cc] font-semibold">Menu Staff:</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-${item.id}`}
                  type="button"
                  onClick={() => {
                    setCurrentTab(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-white text-[#1b2e25] shadow-sm'
                      : 'bg-[#1b2e25] text-white hover:bg-[#2d4b3e]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.id === 'pos' && pendingWebOrdersCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                      {pendingWebOrdersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {onLogoutToCustomer && (
            <div className="pt-2 border-t border-[#2d4b3e]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogoutToCustomer();
                }}
                className="w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-red-950/80 border border-red-800 text-red-200 hover:bg-red-900"
              >
                <Lock className="w-4 h-4" />
                <span>Kunci &amp; Keluar ke Mode Pembeli Publik</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
