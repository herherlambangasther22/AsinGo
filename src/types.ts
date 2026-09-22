export type UserRole = 'owner' | 'kasir' | 'gudang' | 'pelanggan';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  phone?: string;
  avatarColor: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  pricePerKg: number;
  currentStockKg: number;
  minStockKg: number;
  unit: string;
  imageUrl: string;
  description: string;
  isAvailable: boolean;
  qualityGrade?: 'Super' | 'Standar' | 'Premium';
  origin?: string;
  updatedAt: string;
  updatedBy: string;
}

export type WeightOption = '100g' | '250g' | '500g' | '1kg' | '5kg' | '10kg' | 'custom';

export interface CartItem {
  productId: string;
  product: Product;
  quantityKg: number;
  weightOption: WeightOption;
  calculatedPrice: number;
  notes?: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'tempo';
export type PaymentStatus = 'paid' | 'pending';

export interface OrderItem {
  productId: string;
  productName: string;
  quantityKg: number;
  pricePerKg: number;
  subtotal: number;
  notes?: string;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  cashierName: string;
  cashierRole: UserRole;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  finalTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashGiven?: number;
  change?: number;
  notes?: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  changeKg: number;
  previousStockKg: number;
  newStockKg: number;
  type: 'sale' | 'restock' | 'adjustment' | 'spoilage';
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  phone: string;
  ownerWaNumber: string;
  address: string;
  footerReceiptMessage: string;
  lowStockThresholdDefault: number;
  currencyPrefix: string;
  logoUrl?: string;
  loadingLogoUrl?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'READ' | 'WRITE_ORDER' | 'WRITE_STOCK' | 'WRITE_PRODUCT' | 'BACKUP_AUTO' | 'BACKUP_MANUAL' | 'RESTORE' | 'DELETE_BACKUP' | 'AUTH_SUCCESS' | 'AUTH_FAILED' | 'SECURITY_SCAN';
  user: string;
  role: string;
  ip: string;
  details: string;
  checksumSha256?: string;
  status: 'SUCCESS' | 'WARN' | 'BLOCKED';
}

export interface DatabaseSecurityStatus {
  databaseRoot: string;
  liveDatabasePath: string;
  backupsPath: string;
  logsPath: string;
  masterChecksum: string;
  isIntegrityVerified: boolean;
  totalBackups: number;
  totalAuditLogs: number;
  lastBackupTime: string;
  nextAutoBackupInSeconds: number;
  encryptionAlgorithm: string;
  atomicWritesEnabled: boolean;
  antiBruteForceStatus: string;
}

export interface BackupMetadata {
  id: string;
  filename: string;
  timestamp: string;
  type: 'auto_5min' | 'manual' | 'emergency_prerestore';
  sizeBytes: number;
  sizeFormatted: string;
  totalProducts: number;
  totalOrders: number;
  totalStockLogs: number;
  checksumSha256: string;
  description: string;
}

export interface BackupDataPayload {
  version: string;
  appName: string;
  exportedAt: string;
  type: 'auto_5min' | 'manual' | 'emergency_prerestore';
  checksumSha256: string;
  database: {
    products: Product[];
    orders: Order[];
    stockLogs: StockLog[];
    settings: StoreSettings;
    users: User[];
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalStockLogs: number;
    totalUsers: number;
  };
}

export interface RealtimeMessage {
  type:
    | 'INIT'
    | 'PRODUCT_UPDATED'
    | 'PRODUCT_DELETED'
    | 'STOCK_UPDATED'
    | 'IMAGE_UPDATED'
    | 'ORDER_CREATED'
    | 'ALERT'
    | 'BACKUP_CREATED'
    | 'DATABASE_RESTORED'
    | 'AUDIT_LOG_ADDED';
  payload: any;
  timestamp: string;
}
