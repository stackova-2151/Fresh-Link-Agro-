import type { RentalItem, StockTransaction, Chamber, GatePass, User, Vendor, Client, Invoice } from '@/lib/types';

export const users: User[] = [
  { id: 'user_01', name: 'Alex', email: 'alex@example.com', role: 'Admin' },
  { id: 'user_02', name: 'Maria', email: 'maria@example.com', role: 'Storekeeper' },
  { id: 'user_03', name: 'Chen', email: 'chen@example.com', role: 'Gatekeeper' }
];

export const vendors: Vendor[] = [
    { id: 'vendor_01', name: 'Global Foods Inc.' },
    { id: 'vendor_02', name: 'Fresh Produce Co.' }
];

export const clients: Client[] = [
    { id: 'cust_01', name: 'JK TRADING COMPANY', phone: '9876543210', address: 'Market Yard, Bangalore', billingCycle: 'monthly', rentAmount: 50000, pendingPayment: 10000 },
    { id: 'cust_02', name: 'Prestige Catering', phone: '9876543211', address: '123 Food Street, Bangalore', billingCycle: 'monthly', rentAmount: 25000, pendingPayment: 0 },
];

export const rentalItems: RentalItem[] = [
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
  },
  {
    id: 'item_02',
    inwardNumber: '06856',
    name: 'JWARI',
    brand: 'MAHARAJA',
    batchNumber: 'JKT114',
    category: 'Grains',
    description: 'Fresh Inward Stock',
    rentalRate: 1.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 114,
    outwardQuantity: 0,
    quantityAvailable: 114,
    unit: 'bags',
    inwardWeight: 3420.00,
    outwardWeight: 0.00,
    balanceWeight: 3420.00,
    expiryDate: new Date('2025-12-31'),
    storageDate: new Date('2025-04-12'),
    temperatureRange: 'Ambient',
    vendorId: 'vendor_01',
    clientId: 'cust_01',
    chamberId: 'chamber_01',
    images: [],
    condition: 'New'
  },
  {
    id: 'item_03',
    inwardNumber: '06863',
    name: 'JWARI',
    brand: 'RAJHANS',
    batchNumber: 'JKT90',
    category: 'Grains',
    description: 'Fresh Inward Stock',
    rentalRate: 1.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 90,
    outwardQuantity: 38,
    quantityAvailable: 52,
    unit: 'bags',
    inwardWeight: 2700.00,
    outwardWeight: 1140.00,
    balanceWeight: 1560.00,
    expiryDate: new Date('2025-12-31'),
    storageDate: new Date('2025-04-13'),
    temperatureRange: 'Ambient',
    vendorId: 'vendor_01',
    clientId: 'cust_01',
    chamberId: 'chamber_01',
    images: [],
    condition: 'New'
  },
  {
    id: 'item_04',
    inwardNumber: '06872',
    name: 'JWARI',
    brand: 'LAYBHARI',
    batchNumber: 'JKT120',
    category: 'Grains',
    description: 'Fresh Inward Stock',
    rentalRate: 1.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 120,
    outwardQuantity: 0,
    quantityAvailable: 120,
    unit: 'bags',
    inwardWeight: 3600.00,
    outwardWeight: 0.00,
    balanceWeight: 3600.00,
    expiryDate: new Date('2025-12-31'),
    storageDate: new Date('2025-04-15'),
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
    name: 'JWARI-1',
    temperature: 'Ambient',
    isActive: true,
    dailyRentRate: 500,
    products: [
        { id: 'item_01', name: 'JWARI', quantityAvailable: 101, unit: 'kg' },
    ],
    boxDimensions: { length: 500, width: 400, height: 250 }
  }
];

export const gatePasses: GatePass[] = [];

export const invoices: Invoice[] = [];
