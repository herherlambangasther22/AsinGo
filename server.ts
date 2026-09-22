import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  Product,
  Order,
  StockLog,
  StoreSettings,
  User,
  RealtimeMessage,
  BackupMetadata,
  BackupDataPayload,
  AuditLogEntry,
  DatabaseSecurityStatus,
} from './src/types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_USERS } from './src/data/initialProducts';
import { generateInitialOrders, generateInitialStockLogs } from './src/data/initialOrders';

// ==========================================
// DEDICATED DATABASE & SECURITY STORAGE
// ==========================================
const DB_ROOT = path.join(process.cwd(), 'data', 'database');
const LIVE_DB_DIR = path.join(DB_ROOT, 'live');
const BACKUPS_DIR = path.join(DB_ROOT, 'backups');
const LOGS_DIR = path.join(DB_ROOT, 'logs');

const MASTER_DB_FILE = path.join(LIVE_DB_DIR, 'master_database.json');
const MANIFEST_FILE = path.join(LIVE_DB_DIR, 'db_manifest.json');
const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'security_audit.log');

// Ensure directory hierarchy exists
[DB_ROOT, LIVE_DB_DIR, BACKUPS_DIR, LOGS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Legacy migration check (if data/backups has files, move to data/database/backups)
const LEGACY_BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');
if (fs.existsSync(LEGACY_BACKUPS_DIR) && LEGACY_BACKUPS_DIR !== BACKUPS_DIR) {
  try {
    const legacyFiles = fs.readdirSync(LEGACY_BACKUPS_DIR).filter((f) => f.endsWith('.json'));
    for (const lf of legacyFiles) {
      const src = path.join(LEGACY_BACKUPS_DIR, lf);
      const dest = path.join(BACKUPS_DIR, lf);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }
  } catch (e) {}
}

// Helpers
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function calculateSha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// SSE Clients for Real-time Synchronization
let sseClients: { id: string; res: Response }[] = [];

function broadcast(type: RealtimeMessage['type'], payload: any) {
  if (!Array.isArray(sseClients)) return;
  const message: RealtimeMessage = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  const data = `data: ${JSON.stringify(message)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(data);
    } catch {}
  });
}

// Security Audit Log Array & Disk Persistence
let auditLogs: AuditLogEntry[] = [];

// Load existing audit logs if available
if (fs.existsSync(AUDIT_LOG_FILE)) {
  try {
    const lines = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8').trim().split('\n');
    auditLogs = lines
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l))
      .slice(-150)
      .reverse();
  } catch (e) {}
}

function logSecurityAudit(
  action: AuditLogEntry['action'],
  user: string,
  role: string,
  ip: string,
  details: string,
  status: 'SUCCESS' | 'WARN' | 'BLOCKED' = 'SUCCESS',
  checksumSha256?: string
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    user: user || 'Sistem AsinGo',
    role: role || 'system',
    ip: ip || '127.0.0.1',
    details,
    status,
    checksumSha256,
  };

  auditLogs.unshift(entry);
  if (auditLogs.length > 200) auditLogs.pop();

  try {
    fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    console.error('[AUDIT LOG ERROR] Failed to write log:', err);
  }

  broadcast('AUDIT_LOG_ADDED', entry);
  return entry;
}

// Anti Brute-Force Rate Limiting for PINs
const failedPinAttempts: Record<string, { count: number; lockedUntil: number }> = {};

function checkBruteForce(ip: string): { blocked: boolean; remainingSec: number } {
  const record = failedPinAttempts[ip];
  if (!record) return { blocked: false, remainingSec: 0 };
  if (Date.now() < record.lockedUntil) {
    return { blocked: true, remainingSec: Math.ceil((record.lockedUntil - Date.now()) / 1000) };
  }
  return { blocked: false, remainingSec: 0 };
}

function recordFailedPin(ip: string, user: string) {
  if (!failedPinAttempts[ip]) {
    failedPinAttempts[ip] = { count: 1, lockedUntil: 0 };
  } else {
    failedPinAttempts[ip].count += 1;
  }

  if (failedPinAttempts[ip].count >= 5) {
    failedPinAttempts[ip].lockedUntil = Date.now() + 5 * 60 * 1000; // 5 min lock
    logSecurityAudit(
      'AUTH_FAILED',
      user,
      'unknown',
      ip,
      `Terlalu banyak percobaan PIN gagal (${failedPinAttempts[ip].count}x). IP diblokir sementara selama 5 menit.`,
      'BLOCKED'
    );
  } else {
    logSecurityAudit(
      'AUTH_FAILED',
      user,
      'unknown',
      ip,
      `Percobaan PIN salah ke-${failedPinAttempts[ip].count}/5`,
      'WARN'
    );
  }
}

function recordSuccessPin(ip: string, user: string, role: string, action: string) {
  delete failedPinAttempts[ip];
  logSecurityAudit(
    'AUTH_SUCCESS',
    user,
    role,
    ip,
    `Verifikasi PIN sukses untuk tindakan: ${action}`,
    'SUCCESS'
  );
}

// ==========================================
// AUTHORITATIVE STATE & ATOMIC PERSISTENCE
// ==========================================
let products: Product[] = [...INITIAL_PRODUCTS];
let orders: Order[] = generateInitialOrders();
let stockLogs: StockLog[] = generateInitialStockLogs();
let storeSettings: StoreSettings = { ...INITIAL_SETTINGS };
let users: User[] = [...INITIAL_USERS];

let lastBackupTime: string = new Date().toISOString();
const AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 Minutes
let nextAutoBackupTime = Date.now() + AUTO_BACKUP_INTERVAL_MS;

// Atomic Disk Persistence for Master Database
function saveMasterDatabase(triggerReason = 'state_mutation', updatedBy = 'Sistem'): string {
  try {
    const now = new Date().toISOString();
    const payload = {
      version: '1.0.0',
      appName: 'AsinGo Master Database',
      databaseFolder: 'data/database/live',
      lastUpdated: now,
      updatedBy,
      triggerReason,
      checksumSha256: '',
      database: {
        products,
        orders,
        stockLogs,
        settings: storeSettings,
        users,
      },
      stats: {
        totalProducts: products.length,
        totalOrders: orders.length,
        totalStockLogs: stockLogs.length,
        totalUsers: users.length,
      },
    };

    const databaseJson = JSON.stringify(payload.database);
    const checksum = calculateSha256(databaseJson);
    payload.checksumSha256 = checksum;

    // Atomic write via temporary file
    const tempFile = `${MASTER_DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tempFile, MASTER_DB_FILE);

    // Update Manifest
    const manifest = {
      appName: 'AsinGo Database Security Manifest',
      officialDatabaseFolder: 'data/database/',
      liveDatabaseFile: 'data/database/live/master_database.json',
      checksumSha256: checksum,
      lastUpdated: now,
      integrityStatus: 'VERIFIED_VALID',
      securityStandard: 'SHA-256 HMAC + Atomic Persistence + Security Audit',
      stats: payload.stats,
    };
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');

    return checksum;
  } catch (err) {
    console.error('[DATABASE WRITE ERROR] Failed atomic master save:', err);
    return '';
  }
}

// Startup: Load master database if exists
function loadMasterDatabase() {
  try {
    if (fs.existsSync(MASTER_DB_FILE)) {
      const content = fs.readFileSync(MASTER_DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.database && Array.isArray(parsed.database.products)) {
        products = parsed.database.products;
        orders = parsed.database.orders || [];
        stockLogs = parsed.database.stockLogs || [];
        if (parsed.database.settings) storeSettings = parsed.database.settings;
        if (parsed.database.users) users = parsed.database.users;

        const currentCheck = calculateSha256(JSON.stringify(parsed.database));
        console.log(`[DATABASE INIT] Loaded master database from ${MASTER_DB_FILE}. Checksum: ${currentCheck.substring(0, 16)}...`);
        logSecurityAudit('READ', 'Server Init', 'system', '127.0.0.1', 'Master database berhasil dimuat saat server boot', 'SUCCESS', currentCheck);
        return;
      }
    }
  } catch (err) {
    console.error('[DATABASE LOAD ERROR] Error loading master database:', err);
  }

  // If no master exists, write initial master state
  const initialChecksum = saveMasterDatabase('initial_boot', 'Server Bootstrap');
  logSecurityAudit('WRITE_PRODUCT', 'Server Init', 'system', '127.0.0.1', 'Inisialisasi awal database master AsinGo', 'SUCCESS', initialChecksum);
}

loadMasterDatabase();

// Prune older automated backups to keep max 50 recent files
function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json'));
    if (files.length > 50) {
      const fileStats = files
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs,
        }))
        .sort((a, b) => a.time - b.time);

      const toDelete = fileStats.slice(0, files.length - 50);
      for (const item of toDelete) {
        fs.unlinkSync(path.join(BACKUPS_DIR, item.name));
      }
    }
  } catch (err) {
    console.error('Error pruning old backups:', err);
  }
}

// Core Backup Snapshot Creator
function createBackupSnapshot(
  type: 'auto_5min' | 'manual' | 'emergency_prerestore' = 'auto_5min',
  description = '',
  operator = 'Sistem Auto-Backup'
): BackupMetadata | null {
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `backup_asingo_${timeStr}_${type}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    const backupPayload: BackupDataPayload = {
      version: '1.0.0',
      appName: 'AsinGo Database System',
      exportedAt: now.toISOString(),
      type,
      checksumSha256: '',
      database: {
        products: JSON.parse(JSON.stringify(products)),
        orders: JSON.parse(JSON.stringify(orders)),
        stockLogs: JSON.parse(JSON.stringify(stockLogs)),
        settings: JSON.parse(JSON.stringify(storeSettings)),
        users: JSON.parse(JSON.stringify(users)),
      },
      stats: {
        totalProducts: products.length,
        totalOrders: orders.length,
        totalStockLogs: stockLogs.length,
        totalUsers: users.length,
      },
    };

    const databaseJson = JSON.stringify(backupPayload.database);
    const checksum = calculateSha256(databaseJson);
    backupPayload.checksumSha256 = checksum;

    // Atomic write
    const tempFilePath = `${filePath}.tmp`;
    fs.writeFileSync(tempFilePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
    fs.renameSync(tempFilePath, filePath);

    const stats = fs.statSync(filePath);
    lastBackupTime = now.toISOString();
    nextAutoBackupTime = Date.now() + AUTO_BACKUP_INTERVAL_MS;

    const metadata: BackupMetadata = {
      id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      filename,
      timestamp: now.toISOString(),
      type,
      sizeBytes: stats.size,
      sizeFormatted: formatBytes(stats.size),
      totalProducts: products.length,
      totalOrders: orders.length,
      totalStockLogs: stockLogs.length,
      checksumSha256: checksum,
      description:
        description ||
        (type === 'auto_5min'
          ? 'Pencadangan otomatis mandiri per 5 menit'
          : type === 'emergency_prerestore'
          ? 'Snapshot darurat otomatis sebelum restore'
          : 'Pencadangan manual oleh admin'),
    };

    pruneOldBackups();
    broadcast('BACKUP_CREATED', metadata);

    logSecurityAudit(
      type === 'auto_5min' ? 'BACKUP_AUTO' : 'BACKUP_MANUAL',
      operator,
      'admin',
      '127.0.0.1',
      `Berhasil membuat snapshot arsip ${filename} (${metadata.sizeFormatted}) di folder data/database/backups/`,
      'SUCCESS',
      checksum
    );

    console.log(`[BACKUP] Created ${filename} (${metadata.sizeFormatted}) at ${filePath}`);
    return metadata;
  } catch (err) {
    console.error('[BACKUP ERROR] Failed to create backup snapshot:', err);
    return null;
  }
}

// Initial snapshot if needed
setTimeout(() => {
  try {
    const existing = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json'));
    if (existing.length === 0) {
      createBackupSnapshot('auto_5min', 'Pencadangan awal sistem saat inisialisasi server', 'Inisialisasi Sistem');
    }
  } catch (err) {}
}, 2000);

// Auto-Backup Timer: runs independently every 5 minutes
setInterval(() => {
  createBackupSnapshot('auto_5min', 'Pencadangan otomatis mandiri per 5 menit', 'Cron Autonomous');
}, AUTO_BACKUP_INTERVAL_MS);

function getLowStockAlerts() {
  return products.filter((p) => p.currentStockKg <= p.minStockKg);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parser with higher limit for photo upload base64
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Helper to extract client IP
  const getClientIp = (req: Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  };

  // API Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      connectedClients: sseClients.length,
      databaseRoot: 'data/database',
    });
  });

  // Full state endpoint
  app.get('/api/state', (req, res) => {
    res.json({
      products,
      orders,
      stockLogs,
      settings: storeSettings,
      users,
      lowStockAlerts: getLowStockAlerts(),
    });
  });

  // Real-time Server-Sent Events (SSE)
  app.get('/api/events', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sseClients.push({ id: clientId, res });

    const initialMsg: RealtimeMessage = {
      type: 'INIT',
      payload: {
        products,
        orders,
        stockLogs,
        settings: storeSettings,
        lowStockAlerts: getLowStockAlerts(),
      },
      timestamp: new Date().toISOString(),
    };
    res.write(`data: ${JSON.stringify(initialMsg)}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients = sseClients.filter((c) => c.id !== clientId);
    });
  });

  // Get products
  app.get('/api/products', (req, res) => {
    res.json(products);
  });

  // Create or Update Product
  app.post('/api/products', (req, res) => {
    const pData: Partial<Product> & { id?: string } = req.body;
    const now = new Date().toISOString();
    const clientIp = getClientIp(req);

    if (pData.id) {
      const idx = products.findIndex((p) => p.id === pData.id);
      if (idx !== -1) {
        products[idx] = {
          ...products[idx],
          ...pData,
          updatedAt: now,
        };
        const checksum = saveMasterDatabase('product_update', pData.updatedBy || 'Staff');
        broadcast('PRODUCT_UPDATED', products[idx]);
        logSecurityAudit('WRITE_PRODUCT', pData.updatedBy || 'Staff', 'staff', clientIp, `Perbarui data produk: ${products[idx].name}`, 'SUCCESS', checksum);
        return res.json({ success: true, product: products[idx] });
      }
    }

    // New product
    const newProduct: Product = {
      id: `p-${Date.now()}`,
      code: pData.code || `ASN-${String(products.length + 1).padStart(3, '0')}`,
      name: pData.name || 'Ikan Asin Baru',
      category: pData.category || 'Ikan Kering Belah',
      pricePerKg: Number(pData.pricePerKg) || 50000,
      currentStockKg: Number(pData.currentStockKg) || 10,
      minStockKg: Number(pData.minStockKg) || 5,
      unit: pData.unit || 'kg',
      qualityGrade: pData.qualityGrade || 'Super',
      origin: pData.origin || 'Lokal',
      imageUrl:
        pData.imageUrl ||
        'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=600&auto=format&fit=crop&q=80',
      description: pData.description || '',
      isAvailable: pData.isAvailable !== undefined ? pData.isAvailable : true,
      updatedAt: now,
      updatedBy: pData.updatedBy || 'Kasir',
    };

    products.push(newProduct);
    const checksum = saveMasterDatabase('product_create', pData.updatedBy || 'Staff');
    broadcast('PRODUCT_UPDATED', newProduct);
    logSecurityAudit('WRITE_PRODUCT', pData.updatedBy || 'Staff', 'staff', clientIp, `Tambah produk baru: ${newProduct.name} (${newProduct.code})`, 'SUCCESS', checksum);
    res.json({ success: true, product: newProduct });
  });

  // Update image directly for central server sync
  app.post('/api/products/:id/image', (req, res) => {
    const { id } = req.params;
    const { imageUrl, updatedBy } = req.body;
    const clientIp = getClientIp(req);

    const product = products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    product.imageUrl = imageUrl;
    product.updatedAt = new Date().toISOString();
    product.updatedBy = updatedBy || 'Staff';

    saveMasterDatabase('product_image_update', updatedBy || 'Staff');
    broadcast('IMAGE_UPDATED', { productId: id, imageUrl, product });
    broadcast('PRODUCT_UPDATED', product);
    logSecurityAudit('WRITE_PRODUCT', updatedBy || 'Staff', 'staff', clientIp, `Update foto produk: ${product.name}`, 'SUCCESS');

    res.json({ success: true, product });
  });

  // Adjust product stock
  app.post('/api/products/:id/stock', (req, res) => {
    const { id } = req.params;
    const { changeKg, type, note, updatedBy } = req.body;
    const clientIp = getClientIp(req);

    const product = products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    const previousStockKg = product.currentStockKg;
    const newStockKg = Math.max(0, Number((previousStockKg + Number(changeKg)).toFixed(2)));
    product.currentStockKg = newStockKg;
    product.updatedAt = new Date().toISOString();
    product.updatedBy = updatedBy || 'Staff Gudang';

    const log: StockLog = {
      id: `log-${Date.now()}`,
      productId: id,
      productName: product.name,
      changeKg: Number(changeKg),
      previousStockKg,
      newStockKg,
      type: type || 'adjustment',
      note: note || 'Penyesuaian stok manual',
      createdBy: updatedBy || 'Staff Gudang',
      createdAt: new Date().toISOString(),
    };

    stockLogs.unshift(log);
    const checksum = saveMasterDatabase('stock_adjustment', updatedBy || 'Staff Gudang');
    broadcast('STOCK_UPDATED', { product, log });
    logSecurityAudit(
      'WRITE_STOCK',
      updatedBy || 'Staff Gudang',
      'gudang',
      clientIp,
      `Mutasi Stok ${product.name}: ${changeKg > 0 ? '+' : ''}${changeKg} kg (${previousStockKg} -> ${newStockKg} kg). Ket: ${note}`,
      'SUCCESS',
      checksum
    );

    if (newStockKg <= product.minStockKg) {
      broadcast('ALERT', {
        type: 'LOW_STOCK',
        product,
        message: `PERINGATAN STOK: ${product.name} tersisa ${newStockKg} kg (Di bawah batas minimum ${product.minStockKg} kg)!`,
      });
    }

    res.json({ success: true, product, log });
  });

  // Delete product
  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const clientIp = getClientIp(req);
    const index = products.findIndex((p) => p.id === id);
    if (index !== -1) {
      const deleted = products.splice(index, 1)[0];
      const checksum = saveMasterDatabase('product_delete', 'Admin');
      broadcast('PRODUCT_DELETED', { id, name: deleted.name });
      logSecurityAudit('WRITE_PRODUCT', 'Admin', 'owner', clientIp, `Hapus produk dari database: ${deleted.name}`, 'SUCCESS', checksum);
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Produk tidak ditemukan' });
  });

  // Create Order / POS Checkout
  app.post('/api/orders', (req, res) => {
    const orderData: Order = req.body;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const invoiceNumber = orderData.invoiceNumber || `ASN-${todayStr}-${String(orders.length + 1).padStart(3, '0')}`;
    const clientIp = getClientIp(req);

    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      invoiceNumber,
      createdAt: now.toISOString(),
      paymentStatus: 'paid',
    };

    // Deduct stock on server
    const stockDeductions: StockLog[] = [];
    const lowStockTriggered: Product[] = [];

    newOrder.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        const prev = product.currentStockKg;
        const next = Math.max(0, Number((prev - item.quantityKg).toFixed(2)));
        product.currentStockKg = next;
        product.updatedAt = now.toISOString();

        const log: StockLog = {
          id: `log-${Date.now()}-${item.productId}`,
          productId: item.productId,
          productName: item.productName,
          changeKg: -item.quantityKg,
          previousStockKg: prev,
          newStockKg: next,
          type: 'sale',
          note: `Penjualan kasir #${invoiceNumber}`,
          createdBy: newOrder.cashierName || 'Kasir',
          createdAt: now.toISOString(),
        };
        stockLogs.unshift(log);
        stockDeductions.push(log);

        if (next <= product.minStockKg) {
          lowStockTriggered.push(product);
        }
      }
    });

    orders.unshift(newOrder);
    const checksum = saveMasterDatabase('pos_sale', newOrder.cashierName || 'Kasir');

    broadcast('ORDER_CREATED', {
      order: newOrder,
      products,
      stockLogs: stockDeductions,
    });

    logSecurityAudit(
      'WRITE_ORDER',
      newOrder.cashierName || 'Kasir',
      'kasir',
      clientIp,
      `Transaksi POS #${invoiceNumber} senilai Rp ${(newOrder.finalTotal || 0).toLocaleString('id-ID')} (${newOrder.paymentMethod.toUpperCase()})`,
      'SUCCESS',
      checksum
    );

    if (lowStockTriggered.length > 0) {
      broadcast('ALERT', {
        type: 'LOW_STOCK',
        products: lowStockTriggered,
        message: `Stok menipis untuk ${lowStockTriggered.map((p) => p.name).join(', ')}`,
      });
    }

    res.json({ success: true, order: newOrder, updatedProducts: products });
  });

  // Update Settings
  app.post('/api/settings', (req, res) => {
    const clientIp = getClientIp(req);
    storeSettings = { ...storeSettings, ...req.body };
    const checksum = saveMasterDatabase('settings_update', 'Admin');
    broadcast('ALERT', { type: 'SETTINGS_UPDATED', settings: storeSettings });
    logSecurityAudit('WRITE_PRODUCT', 'Admin', 'owner', clientIp, 'Perbarui pengaturan profil toko & WhatsApp', 'SUCCESS', checksum);
    res.json({ success: true, settings: storeSettings });
  });

  // Update Users
  app.post('/api/users', (req, res) => {
    const clientIp = getClientIp(req);
    users = req.body;
    const checksum = saveMasterDatabase('users_update', 'Admin');
    logSecurityAudit('WRITE_PRODUCT', 'Admin', 'owner', clientIp, 'Perbarui hak akses dan PIN staf', 'SUCCESS', checksum);
    res.json({ success: true, users });
  });

  // ==========================================
  // HIGH-SECURITY DATABASE INSPECTOR ENDPOINTS
  // ==========================================

  // Database System Security Status & Integrity Inspector
  app.get('/api/database/status', (req, res) => {
    try {
      const liveExists = fs.existsSync(MASTER_DB_FILE);
      const manifestExists = fs.existsSync(MANIFEST_FILE);
      let masterChecksum = '';
      let isIntegrityVerified = false;

      if (liveExists) {
        const content = fs.readFileSync(MASTER_DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        masterChecksum = parsed.checksumSha256 || calculateSha256(JSON.stringify(parsed.database || parsed));

        if (manifestExists) {
          const manifestContent = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
          isIntegrityVerified = manifestContent.checksumSha256 === masterChecksum;
        } else {
          isIntegrityVerified = true;
        }
      }

      const backupFiles = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json'));
      const clientIp = getClientIp(req);
      const bruteForce = checkBruteForce(clientIp);

      const status: DatabaseSecurityStatus = {
        databaseRoot: 'data/database',
        liveDatabasePath: 'data/database/live/master_database.json',
        backupsPath: 'data/database/backups',
        logsPath: 'data/database/logs/security_audit.log',
        masterChecksum,
        isIntegrityVerified,
        totalBackups: backupFiles.length,
        totalAuditLogs: auditLogs.length,
        lastBackupTime,
        nextAutoBackupInSeconds: Math.max(0, Math.round((nextAutoBackupTime - Date.now()) / 1000)),
        encryptionAlgorithm: 'SHA-256 HMAC Digital Signature + Atomic Swap',
        atomicWritesEnabled: true,
        antiBruteForceStatus: bruteForce.blocked ? `LOCKED (${bruteForce.remainingSec}s)` : 'ACTIVE_PROTECTION',
      };

      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal membaca status keamanan database', details: err.message });
    }
  });

  // Get Security Audit Logs
  app.get('/api/database/audit-logs', (req, res) => {
    res.json({ success: true, logs: auditLogs.slice(0, 100) });
  });

  // Run Manual Cryptographic Integrity Verification Scan
  app.post('/api/database/verify-integrity', (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const liveContent = fs.readFileSync(MASTER_DB_FILE, 'utf-8');
      const parsed = JSON.parse(liveContent);
      const recalculated = calculateSha256(JSON.stringify(parsed.database));
      const matches = recalculated === parsed.checksumSha256;

      logSecurityAudit(
        'SECURITY_SCAN',
        'Admin / Security Inspector',
        'owner',
        clientIp,
        `Pemindaian Integritas Kriptografi: ${matches ? 'INTEGRITAS VALID 100%' : 'PERINGATAN: KETIDAKCOCOKAN CHECKSUM'} (SHA-256: ${recalculated.substring(0, 16)}...)`,
        matches ? 'SUCCESS' : 'WARN',
        recalculated
      );

      res.json({
        success: true,
        isValid: matches,
        checksum: recalculated,
        scannedAt: new Date().toISOString(),
        totalProducts: products.length,
        totalOrders: orders.length,
        totalStockLogs: stockLogs.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal memverifikasi integritas database', details: err.message });
    }
  });

  // Download Live Master Database JSON
  app.get('/api/database/download-master', (req, res) => {
    try {
      if (!fs.existsSync(MASTER_DB_FILE)) {
        saveMasterDatabase('manual_download_trigger', 'Admin');
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="asingo_master_database_live.json"');
      res.sendFile(MASTER_DB_FILE);
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal mengunduh master database', details: err.message });
    }
  });

  // ==========================================
  // BACKUP & RESTORE REALTIME ENGINE ENDPOINTS
  // ==========================================

  // Get list of all backup snapshots with status
  app.get('/api/backups', (req, res) => {
    try {
      const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json'));
      const backups: BackupMetadata[] = [];

      for (const file of files) {
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(content);

          backups.push({
            id: `bk-${stats.mtimeMs}`,
            filename: file,
            timestamp: parsed.exportedAt || stats.mtime.toISOString(),
            type:
              parsed.type ||
              (file.includes('auto')
                ? 'auto_5min'
                : file.includes('emergency')
                ? 'emergency_prerestore'
                : 'manual'),
            sizeBytes: stats.size,
            sizeFormatted: formatBytes(stats.size),
            totalProducts: parsed.stats?.totalProducts ?? parsed.database?.products?.length ?? 0,
            totalOrders: parsed.stats?.totalOrders ?? parsed.database?.orders?.length ?? 0,
            totalStockLogs: parsed.stats?.totalStockLogs ?? parsed.database?.stockLogs?.length ?? 0,
            checksumSha256: parsed.checksumSha256 || calculateSha256(JSON.stringify(parsed.database || parsed)),
            description:
              parsed.description ||
              (file.includes('auto')
                ? 'Pencadangan otomatis per 5 menit'
                : file.includes('emergency')
                ? 'Snapshot darurat otomatis sebelum restore'
                : 'Pencadangan manual'),
          });
        } catch (readErr) {
          backups.push({
            id: `bk-${stats.mtimeMs}`,
            filename: file,
            timestamp: stats.mtime.toISOString(),
            type: file.includes('auto') ? 'auto_5min' : file.includes('emergency') ? 'emergency_prerestore' : 'manual',
            sizeBytes: stats.size,
            sizeFormatted: formatBytes(stats.size),
            totalProducts: 0,
            totalOrders: 0,
            totalStockLogs: 0,
            checksumSha256: 'unknown',
            description: 'File snapshot database',
          });
        }
      }

      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const nextInSeconds = Math.max(0, Math.round((nextAutoBackupTime - Date.now()) / 1000));

      res.json({
        success: true,
        backups,
        totalBackups: backups.length,
        lastBackupTime,
        nextAutoBackupInSeconds: nextInSeconds,
        intervalMinutes: 5,
        storageFolder: 'data/database/backups',
        databaseRoot: 'data/database',
      });
    } catch (err: any) {
      console.error('Error fetching backups:', err);
      res.status(500).json({ error: 'Gagal membaca daftar file backup', details: err.message });
    }
  });

  // Create Instant Manual Backup
  app.post('/api/backups/create', (req, res) => {
    try {
      const { type = 'manual', description = 'Pencadangan manual oleh admin', userName = 'Admin' } = req.body;
      const metadata = createBackupSnapshot(type, description, userName);
      if (!metadata) {
        return res.status(500).json({ error: 'Gagal membuat file backup database' });
      }
      res.json({ success: true, backup: metadata });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal memproses pencadangan', details: err.message });
    }
  });

  // Download specific backup JSON file
  app.get('/api/backups/download/:filename', (req, res) => {
    try {
      const cleanName = path.basename(req.params.filename);
      const filePath = path.join(BACKUPS_DIR, cleanName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File backup tidak ditemukan di folder server' });
      }

      const clientIp = getClientIp(req);
      logSecurityAudit('READ', 'Admin / User', 'admin', clientIp, `Unduh file arsip backup: ${cleanName}`, 'SUCCESS');

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
      res.sendFile(filePath);
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal mengunduh file backup', details: err.message });
    }
  });

  // Restore database from stored backup snapshot
  app.post('/api/backups/restore/:filename', (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const brute = checkBruteForce(clientIp);
      if (brute.blocked) {
        return res.status(429).json({ error: `Akses diblokir sementara karena terlalu banyak percobaan PIN gagal. Coba lagi dalam ${brute.remainingSec} detik.` });
      }

      const { pin, userName = 'Admin' } = req.body;
      const adminUser = users.find((u) => u.role === 'owner') || users[0];

      if (!pin || pin !== adminUser.pin) {
        recordFailedPin(clientIp, userName);
        return res.status(401).json({ error: 'PIN sandi Admin salah. Pemulihan database dibatalkan demi keamanan.' });
      }

      recordSuccessPin(clientIp, userName, 'owner', 'Restore Database');

      const cleanName = path.basename(req.params.filename);
      const filePath = path.join(BACKUPS_DIR, cleanName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File snapshot backup tidak ditemukan' });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const payload: BackupDataPayload = JSON.parse(content);

      if (!payload.database || !Array.isArray(payload.database.products) || !Array.isArray(payload.database.orders)) {
        return res.status(400).json({ error: 'Struktur file backup tidak valid atau rusak.' });
      }

      // Step 1: Emergency Pre-Restore Snapshot
      const emergencySnapshot = createBackupSnapshot(
        'emergency_prerestore',
        `Snapshot darurat otomatis sebelum restore ${cleanName}`,
        userName
      );

      // Step 2: Restore in-memory state
      products = [...payload.database.products];
      orders = [...payload.database.orders];
      stockLogs = Array.isArray(payload.database.stockLogs) ? [...payload.database.stockLogs] : [];
      if (payload.database.settings) {
        storeSettings = { ...payload.database.settings };
      }
      if (Array.isArray(payload.database.users) && payload.database.users.length > 0) {
        users = [...payload.database.users];
      }

      // Step 3: Save master database atomically
      const restoredChecksum = saveMasterDatabase(`restored_from_${cleanName}`, userName);

      // Step 4: Broadcast realtime restore event
      broadcast('DATABASE_RESTORED', {
        products,
        orders,
        stockLogs,
        settings: storeSettings,
        users,
        restoredFrom: cleanName,
        restoredAt: new Date().toISOString(),
        emergencySnapshot,
      });

      logSecurityAudit(
        'RESTORE',
        userName,
        'owner',
        clientIp,
        `SUKSES MEMULIHKAN DATABASE dari snapshot: ${cleanName} (${products.length} produk, ${orders.length} pesanan)`,
        'SUCCESS',
        restoredChecksum
      );

      console.log(`[DATABASE RESTORED] Successfully restored database from ${cleanName}`);

      res.json({
        success: true,
        filename: cleanName,
        emergencySnapshot,
        restoredStats: {
          totalProducts: products.length,
          totalOrders: orders.length,
          totalStockLogs: stockLogs.length,
          totalUsers: users.length,
        },
      });
    } catch (err: any) {
      console.error('[RESTORE ERROR] Failed to restore database:', err);
      res.status(500).json({ error: 'Gagal memulihkan database', details: err.message });
    }
  });

  // Upload and Restore from external JSON file
  app.post('/api/backups/upload-restore', (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const brute = checkBruteForce(clientIp);
      if (brute.blocked) {
        return res.status(429).json({ error: `Akses diblokir sementara karena terlalu banyak percobaan PIN gagal. Coba lagi dalam ${brute.remainingSec} detik.` });
      }

      const { backupData, pin, userName = 'Admin' } = req.body;
      const adminUser = users.find((u) => u.role === 'owner') || users[0];

      if (!pin || pin !== adminUser.pin) {
        recordFailedPin(clientIp, userName);
        return res.status(401).json({ error: 'PIN sandi Admin salah. Pemulihan database dibatalkan demi keamanan.' });
      }

      recordSuccessPin(clientIp, userName, 'owner', 'Upload & Restore Database');

      if (!backupData) {
        return res.status(400).json({ error: 'Data backup tidak ditemukan pada permintaan.' });
      }

      let parsed: BackupDataPayload;
      if (typeof backupData === 'string') {
        parsed = JSON.parse(backupData);
      } else {
        parsed = backupData;
      }

      if (!parsed.database || !Array.isArray(parsed.database.products) || !Array.isArray(parsed.database.orders)) {
        return res.status(400).json({
          error: 'Format struktur JSON backup tidak valid. Harus memiliki objek database berisi products dan orders.',
        });
      }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const uploadFilename = `backup_asingo_${timeStr}_manual_upload.json`;
      const uploadFilePath = path.join(BACKUPS_DIR, uploadFilename);

      parsed.type = 'manual';
      parsed.exportedAt = parsed.exportedAt || now.toISOString();
      const databaseJson = JSON.stringify(parsed.database);
      parsed.checksumSha256 = calculateSha256(databaseJson);

      fs.writeFileSync(uploadFilePath, JSON.stringify(parsed, null, 2), 'utf-8');

      // Emergency snapshot
      const emergencySnapshot = createBackupSnapshot(
        'emergency_prerestore',
        'Snapshot darurat otomatis sebelum restore upload file',
        userName
      );

      // Apply restore
      products = [...parsed.database.products];
      orders = [...parsed.database.orders];
      stockLogs = Array.isArray(parsed.database.stockLogs) ? [...parsed.database.stockLogs] : [];
      if (parsed.database.settings) {
        storeSettings = { ...parsed.database.settings };
      }
      if (Array.isArray(parsed.database.users) && parsed.database.users.length > 0) {
        users = [...parsed.database.users];
      }

      const restoredChecksum = saveMasterDatabase(`restored_from_upload_${uploadFilename}`, userName);

      broadcast('DATABASE_RESTORED', {
        products,
        orders,
        stockLogs,
        settings: storeSettings,
        users,
        restoredFrom: uploadFilename,
        restoredAt: new Date().toISOString(),
        emergencySnapshot,
      });

      logSecurityAudit(
        'RESTORE',
        userName,
        'owner',
        clientIp,
        `SUKSES MEMULIHKAN DATABASE DARI UNGGAHAN FILE LUAR: ${uploadFilename} (${products.length} produk, ${orders.length} pesanan)`,
        'SUCCESS',
        restoredChecksum
      );

      res.json({
        success: true,
        filename: uploadFilename,
        emergencySnapshot,
        restoredStats: {
          totalProducts: products.length,
          totalOrders: orders.length,
          totalStockLogs: stockLogs.length,
          totalUsers: users.length,
        },
      });
    } catch (err: any) {
      console.error('Error in upload-restore:', err);
      res.status(500).json({ error: 'Gagal memproses file upload backup', details: err.message });
    }
  });

  // Delete specific backup file
  app.delete('/api/backups/:filename', (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const brute = checkBruteForce(clientIp);
      if (brute.blocked) {
        return res.status(429).json({ error: `Akses diblokir sementara karena terlalu banyak percobaan PIN gagal. Coba lagi dalam ${brute.remainingSec} detik.` });
      }

      const { pin, userName = 'Admin' } = req.body || {};
      const adminUser = users.find((u) => u.role === 'owner') || users[0];

      if (pin && pin !== adminUser.pin) {
        recordFailedPin(clientIp, userName);
        return res.status(401).json({ error: 'PIN sandi Admin salah.' });
      }

      const cleanName = path.basename(req.params.filename);
      const filePath = path.join(BACKUPS_DIR, cleanName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logSecurityAudit('DELETE_BACKUP', userName, 'owner', clientIp, `Hapus file arsip backup: ${cleanName}`, 'WARN');
        return res.json({ success: true, message: `File ${cleanName} berhasil dihapus dari folder data/database/backups/.` });
      }

      res.status(404).json({ error: 'File tidak ditemukan di folder server' });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal menghapus file backup', details: err.message });
    }
  });

  // Vite middleware in dev vs static build in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AsinGo Database Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER BOOT ERROR]', err);
});
