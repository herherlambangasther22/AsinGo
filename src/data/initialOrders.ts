import { Order, StockLog } from '../types';
import { INITIAL_PRODUCTS } from './initialProducts';

export function generateInitialOrders(): Order[] {
  const orders: Order[] = [];
  const now = new Date();
  
  // Create sample transactions for today
  const todayStr = now.toISOString().split('T')[0];
  
  // Transaction 1 (Today morning)
  orders.push({
    id: 'ord-101',
    invoiceNumber: `ASN-${todayStr.replace(/-/g, '')}-001`,
    createdAt: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
    cashierName: 'Kasir',
    cashierRole: 'kasir',
    customerName: 'Ibu Hj. Marlina (Warung Nasi)',
    customerPhone: '081299887766',
    items: [
      {
        productId: 'p-1',
        productName: 'Teri Nasi Super',
        quantityKg: 2.0,
        pricePerKg: 120000,
        subtotal: 240000,
      },
      {
        productId: 'p-5',
        productName: 'Ikan Asin Kembung',
        quantityKg: 3.0,
        pricePerKg: 55000,
        subtotal: 165000,
      },
    ],
    subtotal: 405000,
    discount: 10000,
    finalTotal: 395000,
    paymentMethod: 'qris',
    paymentStatus: 'paid',
    notes: 'Langganan warung makan',
  });

  // Transaction 2 (Today afternoon)
  orders.push({
    id: 'ord-102',
    invoiceNumber: `ASN-${todayStr.replace(/-/g, '')}-002`,
    createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    cashierName: 'Kasir',
    cashierRole: 'kasir',
    customerName: 'Pak Darto',
    customerPhone: '085711223344',
    items: [
      {
        productId: 'p-9',
        productName: 'Ikan Asin Jambal Roti',
        quantityKg: 1.0,
        pricePerKg: 100000,
        subtotal: 100000,
      },
      {
        productId: 'p-10',
        productName: 'Cumi Asin',
        quantityKg: 0.5,
        pricePerKg: 80000,
        subtotal: 40000,
      },
    ],
    subtotal: 140000,
    discount: 0,
    finalTotal: 140000,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    cashGiven: 150000,
    change: 10000,
    notes: 'Bungkus plastik ganda',
  });

  // Transaction 3 (Today noon)
  orders.push({
    id: 'ord-103',
    invoiceNumber: `ASN-${todayStr.replace(/-/g, '')}-003`,
    createdAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    cashierName: 'Admin',
    cashierRole: 'owner',
    customerName: 'Restoran Sambal Pesisir',
    customerPhone: '081377889900',
    items: [
      {
        productId: 'p-7',
        productName: 'Ikan Asin Layang',
        quantityKg: 5.0,
        pricePerKg: 52000,
        subtotal: 260000,
      },
      {
        productId: 'p-8',
        productName: 'Ikan Asin Gabus',
        quantityKg: 5.0,
        pricePerKg: 100000,
        subtotal: 500000,
      },
    ],
    subtotal: 760000,
    discount: 20000,
    finalTotal: 740000,
    paymentMethod: 'transfer',
    paymentStatus: 'paid',
    notes: 'Pesanan grosir untuk resto',
  });

  // Historical orders for previous 25 days to power realistic Monthly Analytics
  for (let i = 1; i <= 25; i++) {
    const pastDate = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dateFormatted = pastDate.toISOString().split('T')[0];
    const orderCountPerDay = 2 + (i % 3);

    for (let j = 1; j <= orderCountPerDay; j++) {
      const p1 = INITIAL_PRODUCTS[(i + j) % INITIAL_PRODUCTS.length];
      const p2 = INITIAL_PRODUCTS[(i + j + 2) % INITIAL_PRODUCTS.length];
      const qty1 = Number((1 + (j * 0.5)).toFixed(1));
      const qty2 = Number((0.5 + ((i % 4) * 0.5)).toFixed(1));

      const subtotal = Math.round(p1.pricePerKg * qty1 + p2.pricePerKg * qty2);
      const discount = subtotal > 400000 ? 10000 : 0;
      const methods: ('cash' | 'qris' | 'transfer')[] = ['cash', 'qris', 'transfer'];
      const method = methods[(i + j) % methods.length];

      orders.push({
        id: `ord-hist-${i}-${j}`,
        invoiceNumber: `ASN-${dateFormatted.replace(/-/g, '')}-00${j}`,
        createdAt: new Date(pastDate.getTime() + (9 + j * 3) * 3600 * 1000).toISOString(),
        cashierName: j % 2 === 0 ? 'Kasir' : 'Admin',
        cashierRole: j % 2 === 0 ? 'kasir' : 'owner',
        customerName: ['Warung Bu Aminah', 'Pak Haji Sobri', 'Ibu Ratna', 'Kedai Ikan Bu Endang', 'Pelanggan Tunai'][ (i + j) % 5 ],
        customerPhone: '0812345678' + (10 + (i % 80)),
        items: [
          {
            productId: p1.id,
            productName: p1.name,
            quantityKg: qty1,
            pricePerKg: p1.pricePerKg,
            subtotal: Math.round(p1.pricePerKg * qty1),
          },
          {
            productId: p2.id,
            productName: p2.name,
            quantityKg: qty2,
            pricePerKg: p2.pricePerKg,
            subtotal: Math.round(p2.pricePerKg * qty2),
          },
        ],
        subtotal,
        discount,
        finalTotal: subtotal - discount,
        paymentMethod: method,
        paymentStatus: 'paid',
        cashGiven: method === 'cash' ? Math.ceil((subtotal - discount) / 50000) * 50000 : undefined,
        change: method === 'cash' ? (Math.ceil((subtotal - discount) / 50000) * 50000) - (subtotal - discount) : undefined,
        notes: 'Transaksi reguler',
      });
    }
  }

  return orders;
}

export function generateInitialStockLogs(): StockLog[] {
  const now = new Date();
  return [
    {
      id: 'log-1',
      productId: 'p-1',
      productName: 'Teri Nasi Super',
      changeKg: 20,
      previousStockKg: 5.0,
      newStockKg: 25.0,
      type: 'restock',
      note: 'Kiriman baru dari nelayan Tuban',
      createdBy: 'Staff Gudang',
      createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'log-2',
      productId: 'p-5',
      productName: 'Ikan Asin Kembung',
      changeKg: -3.0,
      previousStockKg: 27.0,
      newStockKg: 24.0,
      type: 'sale',
      note: 'Penjualan Invoice ASN-001',
      createdBy: 'Kasir',
      createdAt: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
    },
    {
      id: 'log-3',
      productId: 'p-10',
      productName: 'Cumi Asin',
      changeKg: -0.5,
      previousStockKg: 18.5,
      newStockKg: 18.0,
      type: 'sale',
      note: 'Penjualan Invoice ASN-002',
      createdBy: 'Kasir',
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    },
  ];
}
