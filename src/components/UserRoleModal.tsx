import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { X, ShieldCheck, KeyRound, Lock, LogOut, CheckCircle2, UserCheck, ExternalLink } from 'lucide-react';

interface UserRoleModalProps {
  users: User[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User, redirectTab?: 'pos' | 'stock' | 'daily' | 'analytics' | 'catalog' | 'backup') => void;
  initialRole?: UserRole;
  requestedRoute?: string;
}

export const UserRoleModal: React.FC<UserRoleModalProps> = ({
  users,
  currentUser,
  isOpen,
  onClose,
  onSelectUser,
  initialRole,
  requestedRoute,
}) => {
  const isPelanggan = currentUser.role === 'pelanggan';
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || 'owner');
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole, isOpen]);

  if (!isOpen) return null;

  const staffUsers = users.filter((u) => u.role !== 'pelanggan');
  const pelangganUser = users.find((u) => u.role === 'pelanggan') || {
    id: 'u-4',
    name: 'Pelanggan',
    role: 'pelanggan' as UserRole,
    pin: '',
    phone: '',
    avatarColor: '#628E7A',
  };

  const handleLoginStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    const targetUser = users.find((u) => u.role === selectedRole);
    if (!targetUser) {
      setPinError('Akun tidak ditemukan.');
      return;
    }

    if (targetUser.pin && pinInput !== targetUser.pin) {
      setPinError('PIN sandi salah. Silakan periksa kembali PIN Anda.');
      return;
    }

    // Determine target default tab for role
    let targetTab: 'pos' | 'stock' | 'daily' | 'analytics' | 'catalog' | 'backup' = 'pos';
    if (requestedRoute?.includes('daily') || requestedRoute?.includes('laporan')) {
      targetTab = 'daily';
    } else if (requestedRoute?.includes('katalog') || requestedRoute?.includes('catalog')) {
      targetTab = 'catalog';
    } else if (selectedRole === 'owner') {
      targetTab = 'analytics';
    } else if (selectedRole === 'kasir') {
      targetTab = 'pos';
    } else if (selectedRole === 'gudang') {
      targetTab = 'stock';
    }

    onSelectUser(targetUser, targetTab);
    onClose();
  };

  const handleLogoutToCustomer = () => {
    onSelectUser(pelangganUser, 'catalog');
    if (window.history.pushState) {
      window.history.pushState({}, '', '/');
    }
    onClose();
  };

  return (
    <div
      id="user-role-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1b2e25] px-5 py-4 flex items-center justify-between text-white border-b border-[#2d4b3e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2d4b3e] flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isPelanggan
                  ? selectedRole === 'owner'
                    ? 'Login Administrator / Owner'
                    : selectedRole === 'kasir'
                    ? 'Login Kasir Toko'
                    : 'Login Staf Gudang'
                  : 'Kelola Hak Akses Pengguna'}
              </h3>
              <p className="text-xs text-gray-300">
                {isPelanggan ? 'Masukkan PIN sandi verifikasi untuk masuk' : `Aktif sebagai: ${currentUser.name}`}
              </p>
            </div>
          </div>
          <button
            id="close-role-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAFAF8]">
          {isPelanggan ? (
            /* Mode Pembeli: Tampilkan Form Login PIN yang Aman */
            <form onSubmit={handleLoginStaff} className="space-y-4">
              {requestedRoute && (
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <span className="font-semibold">Akses Langsung URL:</span>
                  <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">
                    {requestedRoute}
                  </code>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Pilih Peran Login / Rute Khusus:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('owner');
                      setPinError('');
                      if (window.history.pushState) window.history.pushState({}, '', '/admin');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedRole === 'owner'
                        ? 'bg-[#1b2e25] text-white border-[#1b2e25] font-bold shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-xs">Admin / Owner</span>
                    <span className="text-[10px] font-mono opacity-80 block text-emerald-300">/admin</span>
                    <span className="text-[9px] opacity-75">PIN: 1234</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('kasir');
                      setPinError('');
                      if (window.history.pushState) window.history.pushState({}, '', '/kasir');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedRole === 'kasir'
                        ? 'bg-[#1b2e25] text-white border-[#1b2e25] font-bold shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-xs">Kasir Toko</span>
                    <span className="text-[10px] font-mono opacity-80 block text-emerald-300">/kasir</span>
                    <span className="text-[9px] opacity-75">PIN: 1111</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('gudang');
                      setPinError('');
                      if (window.history.pushState) window.history.pushState({}, '', '/staff');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedRole === 'gudang'
                        ? 'bg-[#1b2e25] text-white border-[#1b2e25] font-bold shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-xs">Staf Gudang</span>
                    <span className="text-[10px] font-mono opacity-80 block text-emerald-300">/staff</span>
                    <span className="text-[9px] opacity-75">PIN: 2222</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  PIN Sandi {selectedRole === 'owner' ? 'Admin / Owner' : selectedRole === 'kasir' ? 'Kasir' : 'Staf Gudang'}:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-pin-login-input"
                    type="password"
                    maxLength={8}
                    required
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError('');
                    }}
                    placeholder={`Masukkan PIN ${selectedRole === 'owner' ? '1234' : selectedRole === 'kasir' ? '1111' : '2222'}`}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#2D4B3E] font-mono text-sm tracking-widest"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  * PIN Default:{' '}
                  <span className="font-semibold text-gray-700">
                    Admin (<strong className="font-mono">1234</strong>), Kasir (<strong className="font-mono">1111</strong>), Gudang (<strong className="font-mono">2222</strong>)
                  </span>
                </p>
              </div>

              {pinError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {pinError}
                </div>
              )}

              <button
                id="submit-staff-login-btn"
                type="submit"
                className="w-full btn-timbul-primary py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                Masuk ke Panel {selectedRole === 'owner' ? 'Admin / Owner' : selectedRole === 'kasir' ? 'Kasir' : 'Gudang'}
              </button>
            </form>
          ) : (
            /* Mode Staff / Admin: Ganti Akun Staf atau Kunci ke Mode Pembeli */
            <div className="space-y-3">
              <div className="bg-[#EAF2ED] p-3.5 rounded-xl border border-[#2D4B3E]/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#2D4B3E] uppercase tracking-wider block">Akun Aktif:</span>
                  <p className="text-sm font-black text-[#1B2E25]">{currentUser.name}</p>
                  <p className="text-xs text-gray-600 capitalize">Role: {currentUser.role === 'owner' ? 'Admin / Pemilik Toko' : currentUser.role}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutToCustomer}
                  className="btn-timbul-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 text-red-700 border-red-200 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Kunci / Mode Pembeli
                </button>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold text-gray-700 mb-2">Ganti Akun Staf / Akses Rute:</p>
                <div className="space-y-2">
                  {staffUsers.map((u) => {
                    const isCurrent = currentUser.id === u.id;
                    const routeBadge = u.role === 'owner' ? '/admin' : u.role === 'kasir' ? '/kasir' : '/staff';
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (!isCurrent) {
                            const targetTab = u.role === 'owner' ? 'analytics' : u.role === 'kasir' ? 'pos' : 'stock';
                            onSelectUser(u, targetTab);
                            if (window.history.pushState) window.history.pushState({}, '', routeBadge);
                            onClose();
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-50 border-[#2D4B3E] ring-1 ring-[#2D4B3E]'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                            style={{ backgroundColor: u.avatarColor || '#2D4B3E' }}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-gray-900">{u.name}</span>
                              <span className="text-[10px] font-mono text-[#2D4B3E] bg-[#EAF2ED] px-1.5 py-0.2 rounded font-semibold">
                                {routeBadge}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 uppercase">{u.role}</span>
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="text-[10px] font-bold bg-[#2D4B3E] text-white px-2 py-0.5 rounded">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-[#2D4B3E] hover:underline">
                            Pilih &rarr;
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white p-3.5 border-t border-gray-200 flex items-center justify-between">
          {!isPelanggan ? (
            <button
              type="button"
              onClick={handleLogoutToCustomer}
              className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Kembali ke Mode Pembeli
            </button>
          ) : (
            <span className="text-[11px] text-gray-500">
              * Khusus pemilik dan staf internal toko
            </span>
          )}
          <button
            id="cancel-role-modal-btn"
            type="button"
            onClick={onClose}
            className="btn-timbul-white px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

