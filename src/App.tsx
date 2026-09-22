import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, Order, StockLog, StoreSettings, User, UserRole, RealtimeMessage, PaymentMethod } from './types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_USERS } from './data/initialProducts';
import { generateInitialOrders, generateInitialStockLogs } from './data/initialOrders';
import { Navbar } from './components/Navbar';
import { POSView } from './components/POSView';
import { StockManager } from './components/StockManager';
import { DailyReportView } from './components/DailyReportView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CustomerCatalogView, CustomerCartItem } from './components/CustomerCatalogView';
import { ImageUploadModal } from './components/ImageUploadModal';
import { ReceiptModal } from './components/ReceiptModal';
import { LowStockModal } from './components/LowStockModal';
import { UserRoleModal } from './components/UserRoleModal';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { BackupRestoreView } from './components/BackupRestoreView';
import { LoadingScreen } from './components/LoadingScreen';
import { CheckCircle, AlertTriangle, Info, Bell, X } from 'lucide-react';
import { playCashierChime, playSuccessSound } from './lib/audioSound';

export default function App() {
  // Primary States
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('asingo_products_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Lock uploaded product images: Upgrade any old unsplash URLs or missing images to the locked permanent default images from INITIAL_PRODUCTS
          return parsed.map((p: Product) => {
            const defaultProd = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
            if (defaultProd) {
              if (!p.imageUrl || p.imageUrl.includes('images.unsplash.com') || p.imageUrl.startsWith('data:image')) {
                return { ...p, imageUrl: defaultProd.imageUrl };
              }
            }
            return p;
          });
        }
      } catch (e) {
        console.error('Failed to parse cached products:', e);
      }
    }
    return INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('asingo_orders_v5');
    return saved ? JSON.parse(saved) : generateInitialOrders();
  });

  const [stockLogs, setStockLogs] = useState<StockLog[]>(() => {
    const saved = localStorage.getItem('asingo_stock_logs_v5');
    return saved ? JSON.parse(saved) : generateInitialStockLogs();
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('asingo_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.ownerWaNumber === '6281234567890' || !parsed.ownerWaNumber) {
          parsed.ownerWaNumber = '+62 895-3511-21278';
        }
        if (!parsed.storeName || parsed.storeName === 'AsinGo Ikan Asin') {
          parsed.storeName = 'AsinGo';
        }
        const effectiveLogo = (!parsed.logoUrl || parsed.logoUrl === '/logo.svg')
          ? INITIAL_SETTINGS.logoUrl
          : parsed.logoUrl;
        const effectiveLoadingLogo = (!parsed.loadingLogoUrl || parsed.loadingLogoUrl === '/logo.svg')
          ? (parsed.logoUrl || INITIAL_SETTINGS.loadingLogoUrl)
          : parsed.loadingLogoUrl;

        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          logoUrl: effectiveLogo,
          loadingLogoUrl: effectiveLoadingLogo,
        };
      } catch (e) {}
    }
    return INITIAL_SETTINGS;
  });

  // App-wide loading screen & live admin preview states
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);
  const [isPreviewingLoading, setIsPreviewingLoading] = useState<boolean>(false);

  const DEFAULT_PELANGGAN: User = INITIAL_USERS.find((u) => u.role === 'pelanggan') || {
    id: 'u-cust',
    name: 'Pelanggan Toko',
    role: 'pelanggan',
    pin: '',
    phone: '',
    avatarColor: '#2D4B3E',
  };

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    // Only restore staff session if explicitly visiting a staff URL path or hash
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const isExplicitStaff =
      path.includes('/admin') ||
      path.includes('/kasir') ||
      path.includes('/staff') ||
      path.includes('/gudang') ||
      hash.includes('admin') ||
      hash.includes('kasir') ||
      hash.includes('staff') ||
      hash.includes('gudang');

    if (isExplicitStaff) {
      const savedStaff = sessionStorage.getItem('asingo_staff_session');
      if (savedStaff) {
        try {
          const parsed = JSON.parse(savedStaff);
          if (parsed && parsed.role && parsed.role !== 'pelanggan') {
            return parsed;
          }
        } catch (e) {}
      }
    }
    // WAJIB default ke Pelanggan Toko untuk semua pembeli, pengunjung web, dan deployment Vercel
    return DEFAULT_PELANGGAN;
  });

  // Navigation State - WAJIB default ke tampilan pembeli / katalog pelanggan (Customer Catalog View)
  const [currentTab, setCurrentTab] = useState<'pos' | 'stock' | 'daily' | 'analytics' | 'catalog' | 'backup'>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const isExplicitStaff =
      path.includes('/admin') ||
      path.includes('/kasir') ||
      path.includes('/staff') ||
      path.includes('/gudang') ||
      hash.includes('admin') ||
      hash.includes('kasir') ||
      hash.includes('staff') ||
      hash.includes('gudang');

    if (isExplicitStaff) {
      const savedStaff = sessionStorage.getItem('asingo_staff_session');
      if (savedStaff) {
        try {
          const parsed = JSON.parse(savedStaff);
          if (parsed && parsed.role && parsed.role !== 'pelanggan') {
            if (parsed.role === 'owner') return 'analytics';
            if (parsed.role === 'gudang') return 'stock';
            return 'pos';
          }
        } catch (e) {}
      }
    }
    // Default mutlak tampilan pembeli (katalog)
    return 'catalog';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Customer Cart & Profile State
  const [customerCart, setCustomerCart] = useState<CustomerCartItem[]>(() => {
    const saved = localStorage.getItem('asingo_customer_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [customerName, setCustomerName] = useState<string>(() => {
    return localStorage.getItem('asingo_customer_name') || '';
  });
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    return localStorage.getItem('asingo_customer_phone') || '';
  });
  const [customerAddress, setCustomerAddress] = useState<string>(() => {
    return localStorage.getItem('asingo_customer_address') || '';
  });

  // Real-time Connection State
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  // Modals
  const [imageModalProduct, setImageModalProduct] = useState<Product | null>(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState<boolean>(false);
  const [isUserRoleModalOpen, setIsUserRoleModalOpen] = useState<boolean>(false);
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

  // Save customer cart
  useEffect(() => {
    localStorage.setItem('asingo_customer_cart', JSON.stringify(customerCart));
  }, [customerCart]);

  // Live Toast Notification Alert
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    type: 'info' | 'warning' | 'success';
    title: string;
    message: string;
  } | null>(null);

  // Dedicated Route & Modal State for /admin, /kasir, /staff
  const [modalInitialRole, setModalInitialRole] = useState<UserRole>('owner');
  const [modalRequestedRoute, setModalRequestedRoute] = useState<string>('');

  const sseRef = useRef<EventSource | null>(null);

  // Unified Tab Switching Handler with URL Synchronization
  const handleTabChange = (
    nextTab: 'pos' | 'stock' | 'daily' | 'analytics' | 'catalog' | 'backup'
  ) => {
    setCurrentTab(nextTab);
    const routeMap: Record<string, string> = {
      pos: '/kasir',
      catalog: '/katalog',
      daily: '/daily',
      stock: '/staff',
      analytics: '/admin',
      backup: '/backup',
    };
    const targetRoute = routeMap[nextTab] || '/';
    if (window.history.pushState && window.location.pathname !== targetRoute) {
      window.history.pushState({}, '', targetRoute);
    }
  };

  // Route Synchronization Handler (Does not force reset when tab changes within allowed permissions)
  const handleRouteSync = useCallback((customUser?: User) => {
    const activeUser = customUser || currentUser;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase().replace('#/', '').replace('#', '');
    const cleanRoute = path !== '/' ? path : hash ? `/${hash}` : '/';

    if (cleanRoute === '/admin' || cleanRoute === '/owner') {
      if (activeUser.role === 'owner') {
        setCurrentTab((prev) => (prev === 'catalog' ? 'analytics' : prev));
      } else {
        setModalInitialRole('owner');
        setModalRequestedRoute('/admin');
        setIsUserRoleModalOpen(true);
      }
    } else if (cleanRoute === '/kasir' || cleanRoute === '/pos') {
      if (activeUser.role === 'kasir' || activeUser.role === 'owner') {
        setCurrentTab((prev) => (prev === 'daily' || prev === 'catalog' ? prev : 'pos'));
      } else {
        setModalInitialRole('kasir');
        setModalRequestedRoute('/kasir');
        setIsUserRoleModalOpen(true);
      }
    } else if (cleanRoute === '/staff' || cleanRoute === '/gudang' || cleanRoute === '/stock') {
      if (activeUser.role === 'gudang' || activeUser.role === 'owner') {
        setCurrentTab((prev) => (prev === 'catalog' ? prev : 'stock'));
      } else {
        setModalInitialRole('gudang');
        setModalRequestedRoute('/staff');
        setIsUserRoleModalOpen(true);
      }
    } else if (cleanRoute === '/daily' || cleanRoute === '/laporan') {
      if (activeUser.role === 'owner' || activeUser.role === 'kasir') {
        setCurrentTab('daily');
      } else {
        setModalInitialRole('kasir');
        setModalRequestedRoute('/daily');
        setIsUserRoleModalOpen(true);
      }
    } else if (cleanRoute === '/analytics' || cleanRoute === '/analitik') {
      if (activeUser.role === 'owner') {
        setCurrentTab('analytics');
      } else {
        setModalInitialRole('owner');
        setModalRequestedRoute('/analytics');
        setIsUserRoleModalOpen(true);
      }
    } else if (cleanRoute === '/backup' || cleanRoute === '/restore') {
      if (activeUser.role === 'owner') {
        setCurrentTab('backup');
      } else {
        setModalInitialRole('owner');
        setModalRequestedRoute('/backup');
        setIsUserRoleModalOpen(true);
      }
    } else if (cleanRoute === '/katalog' || cleanRoute === '/catalog') {
      setCurrentTab('catalog');
    }
  }, [currentUser]);

  // Initial Route Check & Popstate listener
  useEffect(() => {
    handleRouteSync();

    const onLocationChange = () => {
      handleRouteSync();
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, [handleRouteSync]);

  // Save to localStorage as offline safety backup
  useEffect(() => {
    localStorage.setItem('asingo_products_v5', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('asingo_orders_v5', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('asingo_stock_logs_v5', JSON.stringify(stockLogs));
  }, [stockLogs]);

  useEffect(() => {
    localStorage.setItem('asingo_settings', JSON.stringify(settings));
  }, [settings]);

  // Connect to Server & SSE Stream for Real-time synchronization
  const refreshAllData = () => {
    fetch('/api/state')
      .then((res) => {
        if (!res.ok) throw new Error('API not available');
        return res.json();
      })
      .then((data) => {
        if (data.products && Array.isArray(data.products) && data.products.length > 0) setProducts(data.products);
        if (data.orders && Array.isArray(data.orders)) setOrders(data.orders);
        if (data.stockLogs && Array.isArray(data.stockLogs)) setStockLogs(data.stockLogs);
        if (data.settings) setSettings(data.settings);
        if (data.users && Array.isArray(data.users)) setUsers(data.users);
      })
      .catch(() => {
        // Fallback silently to client-side localStorage state (essential for Vercel & offline)
      })
      .finally(() => {
        setTimeout(() => {
          setIsAppLoading(false);
        }, 1200);
      });
  };

  // Graceful safety timer for loading screen finish
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 1. Initial State Fetch
    refreshAllData();

    // 2. Real-Time Server-Sent Events (SSE) with graceful offline fallback
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/events');
      sseRef.current = eventSource;

      eventSource.onopen = () => {
        setIsRealtimeConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const msg: RealtimeMessage = JSON.parse(event.data);
          handleRealtimeMessage(msg);
        } catch (e) {
          console.error('SSE JSON parse error:', e);
        }
      };

      eventSource.onerror = () => {
        setIsRealtimeConnected(false);
      };
    } catch {
      setIsRealtimeConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Pending Web Orders Count waiting for Cashier confirmation
  const pendingWebOrdersCount = orders.filter(
    (o) => o.orderSource === 'web_pelanggan' && o.paymentStatus === 'pending'
  ).length;

  const showToast = (type: 'info' | 'warning' | 'success', title: string, message: string) => {
    const id = `toast-${Date.now()}`;
    setToastNotification({ id, type, title, message });
    setTimeout(() => {
      setToastNotification((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  const handleRealtimeMessage = (msg: RealtimeMessage) => {
    switch (msg.type) {
      case 'INIT':
        if (msg.payload.products) setProducts(msg.payload.products);
        if (msg.payload.orders) setOrders(msg.payload.orders);
        if (msg.payload.stockLogs) setStockLogs(msg.payload.stockLogs);
        if (msg.payload.settings) setSettings(msg.payload.settings);
        break;

      case 'PRODUCT_UPDATED':
        setProducts((prev) => {
          const updated = msg.payload as Product;
          const idx = prev.findIndex((p) => p.id === updated.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [...prev, updated];
        });
        showToast('info', 'Data Produk Diperbarui', `${msg.payload.name} telah disinkronkan secara real-time.`);
        break;

      case 'IMAGE_UPDATED':
        setProducts((prev) =>
          prev.map((p) => (p.id === msg.payload.productId ? { ...p, imageUrl: msg.payload.imageUrl } : p))
        );
        showToast('success', 'Foto Produk Disinkronkan', `Foto ${msg.payload.product?.name || 'ikan asin'} diperbarui di semua layar.`);
        break;

      case 'STOCK_UPDATED':
        setProducts((prev) =>
          prev.map((p) => (p.id === msg.payload.product.id ? msg.payload.product : p))
        );
        if (msg.payload.log) {
          setStockLogs((prev) => [msg.payload.log, ...prev]);
        }
        break;

      case 'ORDER_CREATED':
        setOrders((prev) => [msg.payload.order, ...prev]);
        if (msg.payload.products) {
          setProducts(msg.payload.products);
        }
        if (msg.payload.order?.orderSource === 'web_pelanggan') {
          playCashierChime();
          showToast(
            'info',
            'Orderan Baru dari Web!',
            `Pesanan #${msg.payload.order.invoiceNumber} dari ${msg.payload.order.customerName} masuk. Silakan konfirmasi pembayaran di Kasir.`
          );
        } else {
          showToast('success', 'Transaksi Kasir Baru', `Nota #${msg.payload.order.invoiceNumber} berhasil diproses.`);
        }
        break;

      case 'ORDER_UPDATED':
        setOrders((prev) => {
          const updated = msg.payload.order as Order;
          return prev.map((o) => (o.id === updated.id ? updated : o));
        });
        if (msg.payload.products) {
          setProducts(msg.payload.products);
        }
        if (msg.payload.stockLogs && Array.isArray(msg.payload.stockLogs)) {
          setStockLogs((prev) => [...msg.payload.stockLogs, ...prev]);
        }
        break;

      case 'BACKUP_CREATED':
        showToast('info', 'Pencadangan Otomatis', `Snapshot database tersimpan: ${msg.payload.filename}`);
        break;

      case 'DATABASE_RESTORED':
        if (msg.payload.products) setProducts(msg.payload.products);
        if (msg.payload.orders) setOrders(msg.payload.orders);
        if (msg.payload.stockLogs) setStockLogs(msg.payload.stockLogs);
        if (msg.payload.settings) setSettings(msg.payload.settings);
        if (msg.payload.users) setUsers(msg.payload.users);
        showToast('success', 'Database Dipulihkan', `Seluruh data sistem berhasil dipulihkan dari ${msg.payload.restoredFrom || 'snapshot'}.`);
        break;

      case 'ALERT':
        if (msg.payload.type === 'LOW_STOCK') {
          showToast('warning', 'Peringatan Stok Menipis', msg.payload.message);
        }
        break;
    }
  };

  // API Call Handlers with client-side fallback
  const handleSaveImage = async (productId: string, newImageUrl: string) => {
    // 1. Optimistic local update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, imageUrl: newImageUrl, updatedAt: new Date().toISOString(), updatedBy: currentUser.name }
          : p
      )
    );

    // 2. Send to Server for live broadcast and permanent disk persistence
    try {
      const res = await fetch(`/api/products/${productId}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: newImageUrl, updatedBy: currentUser.name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.product && data.product.imageUrl) {
          setProducts((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, imageUrl: data.product.imageUrl } : p))
          );
        }
        showToast('success', 'Foto Disimpan Permanen', 'Foto produk berhasil disimpan dan diselaraskan ke semua perangkat.');
      }
    } catch (e) {
      console.warn('Server sync skipped in offline mode:', e);
      showToast('success', 'Foto Disimpan Lokal', 'Foto berhasil disimpan pada browser ini.');
    }
  };

  const handleAdjustStock = async (
    productId: string,
    changeKg: number,
    type: StockLog['type'],
    note: string
  ) => {
    // 1. Optimistic update
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, Number((p.currentStockKg + changeKg).toFixed(2)));
          return { ...p, currentStockKg: newStock, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );

    // 2. Server API
    try {
      await fetch(`/api/products/${productId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeKg, type, note, updatedBy: currentUser.name }),
      });
    } catch (e) {
      console.warn('Server sync error:', e);
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.product) {
          setProducts((prev) => {
            const idx = prev.findIndex((p) => p.id === data.product.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = data.product;
              return updated;
            }
            return [...prev, data.product];
          });
        }
      }
    } catch (e) {
      // Local fallback
      if (productData.id) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productData.id ? ({ ...p, ...productData } as Product) : p))
        );
      } else {
        const newP: Product = {
          ...(productData as Product),
          id: `p-${Date.now()}`,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
        };
        setProducts((prev) => [...prev, newP]);
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCreateOrder = async (orderPayload: Partial<Order>): Promise<Order | null> => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const invoiceNumber = `ASN-${todayStr}-${String(orders.length + 1).padStart(3, '0')}`;

    const newOrder: Order = {
      ...(orderPayload as Order),
      id: orderPayload.id || `ord-${Date.now()}`,
      invoiceNumber: orderPayload.invoiceNumber || invoiceNumber,
      createdAt: now.toISOString(),
      orderSource: orderPayload.orderSource || 'kasir_langsung',
      paymentStatus: orderPayload.paymentStatus || 'paid',
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrders((prev) => [data.order, ...prev]);
          if (data.updatedProducts) setProducts(data.updatedProducts);
          if (data.order.orderSource === 'web_pelanggan') {
            playCashierChime();
          }
          return data.order;
        }
      }
    } catch (e) {
      console.warn('Offline order processing:', e);
    }

    // Client fallback:
    // Only deduct stock immediately if payment is already 'paid' (direct POS checkout)
    // If pending from web customer, do NOT deduct stock yet until cashier confirms payment!
    if (newOrder.paymentStatus === 'paid') {
      setProducts((prev) =>
        prev.map((p) => {
          const boughtItem = newOrder.items.find((it) => it.productId === p.id);
          if (boughtItem) {
            const nextStock = Math.max(0, Number((p.currentStockKg - boughtItem.quantityKg).toFixed(2)));
            return { ...p, currentStockKg: nextStock };
          }
          return p;
        })
      );
    }

    setOrders((prev) => [newOrder, ...prev]);
    if (newOrder.orderSource === 'web_pelanggan') {
      playCashierChime();
    }
    return newOrder;
  };

  const handleCreateCustomerOrder = async (orderPayload: Partial<Order>): Promise<Order | null> => {
    return handleCreateOrder({
      ...orderPayload,
      orderSource: 'web_pelanggan',
      paymentStatus: 'pending',
    });
  };

  const handleConfirmPayment = async (
    orderId: string,
    paymentData: {
      paymentMethod: PaymentMethod;
      paymentChannel: string;
      cashGiven?: number;
      change?: number;
    }
  ): Promise<Order | null> => {
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          confirmedBy: currentUser.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
          if (data.updatedProducts) setProducts(data.updatedProducts);
          playSuccessSound();
          showToast(
            'success',
            'Pembayaran Disahkan Kasir',
            `Pesanan #${data.order.invoiceNumber} lunas (${data.order.paymentChannel || data.order.paymentMethod.toUpperCase()}).`
          );
          return data.order;
        }
      }
    } catch (e) {
      console.warn('Offline confirm payment:', e);
    }

    // Client-side fallback
    const target = orders.find((o) => o.id === orderId);
    if (!target) return null;

    const confirmed: Order = {
      ...target,
      paymentStatus: 'paid',
      paymentMethod: paymentData.paymentMethod,
      paymentChannel: paymentData.paymentChannel,
      cashGiven: paymentData.cashGiven,
      change: paymentData.change,
      confirmedBy: currentUser.name,
      confirmedAt: new Date().toISOString(),
    };

    // Deduct stock for offline fallback
    setProducts((prev) =>
      prev.map((p) => {
        const boughtItem = confirmed.items.find((it) => it.productId === p.id);
        if (boughtItem) {
          const nextStock = Math.max(0, Number((p.currentStockKg - boughtItem.quantityKg).toFixed(2)));
          return { ...p, currentStockKg: nextStock };
        }
        return p;
      })
    );

    setOrders((prev) => prev.map((o) => (o.id === orderId ? confirmed : o)));
    playSuccessSound();
    showToast(
      'success',
      'Pembayaran Disahkan Kasir',
      `Pesanan #${confirmed.invoiceNumber} lunas (${confirmed.paymentChannel}).`
    );
    return confirmed;
  };

  const handleCancelOrder = async (orderId: string, reason?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          cancelledBy: currentUser.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
          showToast('info', 'Pesanan Dibatalkan', `Pesanan #${data.order.invoiceNumber} dibatalkan.`);
          return true;
        }
      }
    } catch (e) {
      console.warn('Offline cancel order:', e);
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentStatus: 'cancelled',
              cancelReason: reason || 'Dibatalkan oleh kasir',
              confirmedBy: currentUser.name,
            }
          : o
      )
    );
    showToast('info', 'Pesanan Dibatalkan', `Pesanan dibatalkan.`);
    return true;
  };

  const handleUpdateSettings = async (newSettings: Partial<StoreSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
      showToast('success', 'Pengaturan & Logo Diperbarui', 'Logo dan data toko berhasil disimpan.');
    } catch (e) {
      console.warn(e);
      showToast('info', 'Tersimpan di Perangkat', 'Pengaturan disimpan pada cache browser ini.');
    }
  };

  // Adjust role navigation security
  const handleSelectUser = (
    user: User,
    redirectTab?: 'pos' | 'stock' | 'daily' | 'analytics' | 'catalog' | 'backup'
  ) => {
    setCurrentUser(user);
    if (user.role === 'pelanggan') {
      setCurrentTab('catalog');
      sessionStorage.removeItem('asingo_staff_session');
      localStorage.removeItem('asingo_staff_session');
      if (window.history.pushState) {
        window.history.pushState({}, '', '/');
      }
    } else {
      const userStr = JSON.stringify(user);
      sessionStorage.setItem('asingo_staff_session', userStr);
      localStorage.setItem('asingo_staff_session', userStr);
      let nextTab = redirectTab;
      if (!nextTab) {
        if (user.role === 'owner') nextTab = 'analytics';
        else if (user.role === 'kasir') nextTab = 'pos';
        else if (user.role === 'gudang') nextTab = 'stock';
        else nextTab = 'pos';
      }
      setCurrentTab(nextTab);

      const routeMap: Record<string, string> = {
        pos: '/kasir',
        catalog: '/katalog',
        daily: '/daily',
        stock: '/staff',
        analytics: '/admin',
        backup: '/backup',
      };
      const route = routeMap[nextTab] || (user.role === 'owner' ? '/admin' : user.role === 'kasir' ? '/kasir' : '/staff');
      if (window.history.pushState) {
        window.history.pushState({}, '', route);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8F6] text-[#1A2721] flex flex-col selection:bg-[#2D4B3E] selection:text-white pb-12">
      {/* Elegant Loading Screen (Initial Load or Admin Live Demo) */}
      <LoadingScreen
        isLoading={isAppLoading || isPreviewingLoading}
        logoUrl={settings.logoUrl}
        loadingLogoUrl={settings.loadingLogoUrl}
        storeName={settings.storeName}
        tagline={settings.tagline}
        onFinished={() => {
          if (isPreviewingLoading) setIsPreviewingLoading(false);
        }}
      />

      {/* Real-time Toast Notifications */}
      {toastNotification && (
        <div
          id="toast-notification-banner"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white rounded-2xl border-2 border-[#1E342B] shadow-[0_6px_0_0_#1E342B] p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toastNotification.type === 'warning'
                ? 'bg-amber-100 text-amber-800'
                : toastNotification.type === 'success'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {toastNotification.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : toastNotification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-[#1B2E25]">{toastNotification.title}</h4>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{toastNotification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        currentUser={currentUser}
        onOpenRoleModal={() => setIsUserRoleModalOpen(true)}
        onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenCustomerProfile={() => setIsCustomerProfileOpen(true)}
        onOpenCartDrawer={() => setIsCartDrawerOpen(true)}
        onLogoutToCustomer={() => handleSelectUser(DEFAULT_PELANGGAN)}
        cartItemCount={customerCart.length}
        products={products}
        settings={settings}
        isRealtimeConnected={isRealtimeConnected}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        pendingWebOrdersCount={pendingWebOrdersCount}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'pos' && (
          <POSView
            products={products}
            currentUser={currentUser}
            settings={settings}
            orders={orders}
            onOpenImageModal={(prod) => setImageModalProduct(prod)}
            onCreateOrder={handleCreateOrder}
            onConfirmPayment={handleConfirmPayment}
            onCancelOrder={handleCancelOrder}
            onOrderSuccess={(order) => setReceiptModalOrder(order)}
          />
        )}

        {currentTab === 'catalog' && (
          <CustomerCatalogView
            products={products}
            settings={settings}
            orders={orders}
            onCreateCustomerOrder={handleCreateCustomerOrder}
            customerCart={customerCart}
            setCustomerCart={setCustomerCart}
            isCartDrawerOpen={isCartDrawerOpen}
            setIsCartDrawerOpen={setIsCartDrawerOpen}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
            canEditPhotos={currentUser.role === 'owner' || currentUser.role === 'gudang'}
            onOpenImageModal={(prod) => setImageModalProduct(prod)}
            onOpenStaffLogin={(role) => {
              if (role) {
                setModalInitialRole(role);
                const route = role === 'owner' ? '/admin' : role === 'kasir' ? '/kasir' : '/staff';
                setModalRequestedRoute(route);
              }
              setIsUserRoleModalOpen(true);
            }}
          />
        )}

        {currentTab === 'stock' && (
          <StockManager
            products={products}
            stockLogs={stockLogs}
            settings={settings}
            currentUser={currentUser}
            onOpenImageModal={(prod) => setImageModalProduct(prod)}
            onAdjustStock={handleAdjustStock}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {currentTab === 'daily' && (
          <DailyReportView
            orders={orders}
            products={products}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onViewReceipt={(order) => setReceiptModalOrder(order)}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsDashboard
            orders={orders}
            products={products}
            settings={settings}
          />
        )}

        {currentTab === 'backup' && (
          <BackupRestoreView
            currentUser={currentUser}
            settings={settings}
            onRefreshAllData={refreshAllData}
          />
        )}
      </main>

      {/* MODALS */}
      {/* Central Server Image Upload / Photo Changer Modal */}
      {imageModalProduct && (
        <ImageUploadModal
          product={imageModalProduct}
          isOpen={true}
          onClose={() => setImageModalProduct(null)}
          onSaveImage={handleSaveImage}
        />
      )}

      {/* Printable Receipt & Customer WhatsApp Share Modal */}
      {receiptModalOrder && (
        <ReceiptModal
          order={receiptModalOrder}
          settings={settings}
          isOpen={true}
          onClose={() => setReceiptModalOrder(null)}
        />
      )}

      {/* Low Stock Warning & 1-Click Restock Modal */}
      {isLowStockModalOpen && (
        <LowStockModal
          products={products}
          isOpen={true}
          onClose={() => setIsLowStockModalOpen(false)}
          onRestock={async (productId, addKg, note) => {
            await handleAdjustStock(productId, addKg, 'restock', note);
          }}
        />
      )}

      {/* Multi-User & Role Switcher Modal */}
      {isUserRoleModalOpen && (
        <UserRoleModal
          users={users}
          currentUser={currentUser}
          isOpen={true}
          onClose={() => {
            setIsUserRoleModalOpen(false);
            setModalRequestedRoute('');
          }}
          onSelectUser={handleSelectUser}
          initialRole={modalInitialRole}
          requestedRoute={modalRequestedRoute}
        />
      )}

      {/* Customer Profile & Saved Address Modal */}
      {isCustomerProfileOpen && (
        <CustomerProfileModal
          isOpen={true}
          onClose={() => setIsCustomerProfileOpen(false)}
          settings={settings}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          customerAddress={customerAddress}
          setCustomerAddress={setCustomerAddress}
          onOpenStaffLogin={() => setIsUserRoleModalOpen(true)}
        />
      )}

      {/* Store & WhatsApp Settings Modal (Admin) */}
      {isSettingsModalOpen && (
        <SettingsModal
          settings={settings}
          isOpen={true}
          onClose={() => setIsSettingsModalOpen(false)}
          onSaveSettings={handleUpdateSettings}
          onTriggerLoadingPreview={() => {
            setIsPreviewingLoading(true);
            setTimeout(() => setIsPreviewingLoading(false), 3000);
          }}
        />
      )}
    </div>
  );
}
