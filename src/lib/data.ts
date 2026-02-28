import type { RentalItem, StockTransaction, Chamber, GatePass, User, Vendor, Client, Invoice } from '@/lib/types';

export const users: User[] = [
  { id: 'user_01', name: 'Alex', email: 'alex@example.com', role: 'Admin' },
  { id: 'user_02', name: 'Maria', email: 'maria@example.com', role: 'Storekeeper' },
  { id: 'user_03', name: 'Chen', email: 'chen@example.com', role: 'Gatekeeper' }
];

export const vendors: Vendor[] = [
    { id: 'vendor_01', name: 'Global Foods Inc.' },
    { id: 'vendor_02', name: 'Fresh Produce Co.' },
    { id: 'vendor_03', name: 'Link Logistics' }
];

export const clients: Client[] = [
    { id: 'cust_01', name: 'JK TRADING COMPANY', phone: '9876543210', address: 'Market Yard, Bangalore', billingCycle: 'monthly', rentAmount: 50000, pendingPayment: 10000 },
    { id: 'cust_02', name: 'Prestige Catering', phone: '9876543211', address: '123 Food Street, Bangalore', billingCycle: 'monthly', rentAmount: 25000, pendingPayment: 0 },
    { id: 'cust_03', name: 'SHEETAL ENTERPRISES', phone: '9876543212', address: 'Indiranagar, Bangalore', billingCycle: 'monthly', rentAmount: 35000, pendingPayment: 5000 },
];

export const rentalItems: RentalItem[] = [
  {
    id: 'item_sheetal_01',
    inwardNumber: '08213',
    name: 'WHIIP CREAM',
    brand: 'DECOR',
    batchNumber: 'BATCH-A1',
    category: 'Dairy',
    description: 'Cold storage required',
    rentalRate: 2.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 100,
    outwardQuantity: 0,
    quantityAvailable: 100,
    unit: 'boxes',
    inwardWeight: 1200.00,
    outwardWeight: 0.00,
    balanceWeight: 1200.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2026-01-09'),
    temperatureRange: '-18°C',
    vendorId: 'vendor_03',
    clientId: 'cust_03',
    chamberId: 'chamber_01',
    driverName: 'BIRAPPA',
    vehicleNumber: 'MH12 DT2119',
    images: [],
    condition: 'New'
  },
  {
    id: 'item_sheetal_02',
    inwardNumber: '08213',
    name: 'CHOCO TRAPHAL',
    brand: 'DECOR',
    batchNumber: 'BATCH-B2',
    category: 'Confectionery',
    description: 'Keep frozen',
    rentalRate: 3.0,
    rentalCycles: ['monthly'],
    inwardQuantity: 20,
    outwardQuantity: 0,
    quantityAvailable: 20,
    unit: 'boxes',
    inwardWeight: 240.00,
    outwardWeight: 0.00,
    balanceWeight: 240.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2026-01-09'),
    temperatureRange: '-18°C',
    vendorId: 'vendor_03',
    clientId: 'cust_03',
    chamberId: 'chamber_01',
    driverName: 'BIRAPPA',
    vehicleNumber: 'MH12 DT2119',
    images: [],
    condition: 'New'
  },
  {
    id: 'item_01',
    inwardNumber: '06840',
    name: 'JWARI',
    brand: 'MANIK',
    batchNumber: 'JKT110',
    category: 'Grains',
    description: 'Fresh Inward Stock',
    rentalRate: 1.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 110,
    outwardQuantity: 9,
    quantityAvailable: 101,
    unit: 'bags',
    inwardWeight: 3300.00,
    outwardWeight: 270.00,
    balanceWeight: 3030.00,
    expiryDate: new Date('2025-12-31'),
    storageDate: new Date('2025-04-09'),
    temperatureRange: 'Ambient',
    vendorId: 'vendor_01',
    clientId: 'cust_01',
    chamberId: 'chamber_01',
    images: [],
    condition: 'New'
  }
];

export const transactions: StockTransaction[] = [];

export const chambers: Chamber[] = [
  {
    id: 'chamber_01',
    name: 'FREEZER-1',
    temperature: '-18°C',
    isActive: true,
    dailyRentRate: 800,
    products: [
        { id: 'item_sheetal_01', name: 'WHIIP CREAM', quantityAvailable: 100, unit: 'boxes' },
        { id: 'item_sheetal_02', name: 'CHOCO TRAPHAL', quantityAvailable: 20, unit: 'boxes' },
    ],
    boxDimensions: { length: 800, width: 600, height: 300 }
  }
];

export const gatePasses: GatePass[] = [];

export const invoices: Invoice[] = [
    {
        id: 'inv_01',
        invoiceNumber: 'INV-2026-001',
        clientId: 'cust_03',
        date: new Date('2026-01-31'),
        dueDate: new Date('2026-02-15'),
        items: [
            { itemId: 'item_sheetal_01', name: 'Storage: WHIIP CREAM', quantity: 100, rate: 2.5, amount: 7500 },
            { itemId: 'item_sheetal_02', name: 'Storage: CHOCO TRAPHAL', quantity: 20, rate: 3.0, amount: 1800 }
        ],
        subtotal: 9300,
        tax: 1674,
        total: 10974,
        paidAmount: 0,
        balance: 10974,
        status: 'Pending'
    }
];
