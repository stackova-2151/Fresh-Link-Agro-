import type { RentalItem, Chamber, User, Vendor, Client, Invoice, OutwardEntry, DeliveryOrder, GoodsReceiptNote } from '@/lib/types';

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
    { 
        id: 'cust_01', 
        name: 'JK TRADING COMPANY', 
        email: 'info@jktrading.com',
        phone: '9876543210', 
        optionalPhone: '9876543211',
        address: 'Market Yard, Bangalore', 
        gstNumber: '29ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F',
        bankDetails: {
            accountName: 'JK TRADING COMPANY',
            bankName: 'ICICI Bank',
            accountNo: '123456789012',
            ifsc: 'ICIC0001234'
        },
        billingCycle: 'monthly', 
        rentAmount: 50000, 
        pendingPayment: 10000 
    },
    { 
        id: 'cust_03', 
        name: 'SHEETAL ENTERPRISES', 
        email: 'sheetal@agro.com',
        phone: '9876543212', 
        address: 'Indiranagar, Bangalore', 
        gstNumber: '27AADCF0847N1ZC',
        panNumber: 'AADCF0847N',
        bankDetails: {
            accountName: 'SHEETAL ENTERPRISES',
            bankName: 'State Bank of India',
            accountNo: '456789012345',
            ifsc: 'SBIN0001122'
        },
        billingCycle: 'monthly', 
        rentAmount: 35000, 
        pendingPayment: 5000 
    },
];

export const rentalItems: RentalItem[] = [
  // SHEETAL ENTERPRISES ITEMS
  {
    id: 'item_sheetal_07362',
    inwardNumber: '07362',
    name: 'WHIIP CREAM',
    brand: 'TESTY',
    batchNumber: '',
    category: 'Dairy',
    description: 'Cold storage',
    rentalRate: 1.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 5,
    outwardQuantity: 0,
    quantityAvailable: 5,
    unit: 'boxes',
    inwardWeight: 60.00,
    outwardWeight: 0.00,
    balanceWeight: 60.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2025-07-07'),
    temperatureRange: '-18°C',
    vendorId: 'vendor_03',
    clientId: 'cust_03',
    chamberId: 'chamber_01',
    block: 'A',
    zone: 'Z1',
    images: [],
    condition: 'New'
  },
  {
    id: 'item_sheetal_07994',
    inwardNumber: '07994',
    name: 'WHIIP CREAM',
    brand: 'PEARL',
    batchNumber: '',
    category: 'Dairy',
    description: 'Cold storage',
    rentalRate: 1.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 70,
    outwardQuantity: 67,
    quantityAvailable: 3,
    unit: 'boxes',
    inwardWeight: 840.00,
    outwardWeight: 804.00,
    balanceWeight: 36.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2025-11-23'),
    temperatureRange: '-18°C',
    vendorId: 'vendor_03',
    clientId: 'cust_03',
    chamberId: 'chamber_01',
    block: 'A',
    zone: 'Z2',
    images: [],
    condition: 'New'
  },
  // JK TRADING COMPANY ITEMS
  {
    id: 'jk_06840',
    inwardNumber: '06840',
    name: 'JWARI',
    brand: 'MANIK',
    batchNumber: 'JKT110',
    category: 'Grains',
    description: 'Storage Item',
    rentalRate: 0.45,
    rentalCycles: ['monthly'],
    inwardQuantity: 110,
    outwardQuantity: 9,
    quantityAvailable: 101,
    unit: 'bags',
    inwardWeight: 3300.00,
    outwardWeight: 270.00,
    balanceWeight: 3030.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2025-04-09'),
    temperatureRange: 'Ambient',
    vendorId: 'vendor_01',
    clientId: 'cust_01',
    chamberId: 'chamber_01',
    block: 'D',
    zone: 'Z1',
    images: [],
    condition: 'New'
  }
];

export const outwardEntries: OutwardEntry[] = [
  {
    id: 'out_sheetal_01',
    outwardNumber: '24421',
    outwardDate: new Date('2026-01-02'),
    clientId: 'cust_03',
    inwardNumber: '08152',
    itemName: 'WHIIP CREAM',
    brand: 'PEARL',
    quantity: 20,
    weight: 240.00,
    driverName: 'AKSHAY',
    vehicleNumber: 'MH12TN5281'
  }
];

export const deliveryOrders: DeliveryOrder[] = [
  {
    id: 'do_24421',
    orderNumber: '24421',
    date: new Date('2026-01-02'),
    clientId: 'cust_03',
    address: 'PUNE',
    remark: '',
    driverName: 'AKSHAY',
    vehicleNumber: 'MH12 TN5281',
    gatePassNumber: '01787',
    items: [
      {
        srNo: 1,
        itemName: 'WHIIP CREAM',
        inwardNumber: '08152',
        brand: 'PEARL',
        quantity: 20,
        unit: 'BOX',
        weight: 240.00,
        balanceQty: 10,
        balanceWeight: 120.00
      }
    ]
  }
];

export const goodsReceiptNotes: GoodsReceiptNote[] = [
  {
    id: 'grn_01',
    grnNumber: 'GRN-08213',
    inwardNumber: '08213',
    date: new Date('2026-01-09'),
    clientId: 'cust_03',
    address: 'PUNE',
    remark: '',
    driverName: 'BIRAPPA',
    vehicleNumber: 'MH12 DT2119',
    gatePassNumber: '08038',
    items: [
      {
        srNo: 1,
        itemName: 'WHIIP CREAM',
        brand: 'DECOR',
        batchNumber: '',
        unit: 'BOX',
        weightPerQty: 12,
        quantity: 100,
        weight: 1200.00
      }
    ]
  }
];

export const chambers: Chamber[] = [
  {
    id: 'chamber_01',
    name: 'FREEZER-1',
    temperature: '-18°C',
    isActive: true,
    dailyRentRate: 800,
    products: [],
    boxDimensions: { length: 800, width: 600, height: 300 }
  }
];

export const gatePasses: any[] = [];

export const invoices: Invoice[] = [
    {
        id: 'inv_02163',
        invoiceNumber: '02163',
        clientId: 'cust_03',
        date: new Date('2026-02-05'),
        dueDate: new Date('2026-02-20'),
        items: [],
        subtotal: 3576.56,
        tax: 643.78,
        total: 4220,
        paidAmount: 0,
        balance: 4220,
        status: 'Pending'
    }
];