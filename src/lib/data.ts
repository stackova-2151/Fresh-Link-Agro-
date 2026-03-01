import type { RentalItem, StockTransaction, Chamber, GatePass, User, Vendor, Client, Invoice, OutwardEntry, DeliveryOrder, GoodsReceiptNote } from '@/lib/types';

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
    driverName: 'UNKNOWN',
    vehicleNumber: 'UNKNOWN',
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
    images: [],
    condition: 'New'
  },
  {
    id: 'item_sheetal_08152',
    inwardNumber: '08152',
    name: 'WHIIP CREAM',
    brand: 'PEARL',
    batchNumber: '',
    category: 'Dairy',
    description: 'Cold storage',
    rentalRate: 1.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 30,
    outwardQuantity: 0,
    quantityAvailable: 30,
    unit: 'boxes',
    inwardWeight: 360.00,
    outwardWeight: 0.00,
    balanceWeight: 360.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2025-12-26'),
    temperatureRange: '-18°C',
    vendorId: 'vendor_03',
    clientId: 'cust_03',
    chamberId: 'chamber_01',
    images: [],
    condition: 'New'
  },
  {
    id: 'item_sheetal_08213',
    inwardNumber: '08213',
    name: 'WHIIP CREAM',
    brand: 'DECOR',
    batchNumber: 'BATCH-A1',
    category: 'Dairy',
    description: 'Cold storage',
    rentalRate: 1.5,
    rentalCycles: ['monthly'],
    inwardQuantity: 100,
    outwardQuantity: 100,
    quantityAvailable: 0,
    unit: 'boxes',
    inwardWeight: 1200.00,
    outwardWeight: 1200.00,
    balanceWeight: 0.00,
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
    id: 'item_sheetal_08213_choco',
    inwardNumber: '08213',
    name: 'CHOCO TRAPHAL',
    brand: 'DECOR',
    batchNumber: '',
    category: 'Dairy',
    description: 'Cold storage',
    rentalRate: 1.5,
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
    images: [],
    condition: 'New'
  },
  // JK TRADING COMPANY ITEMS
  {
    id: 'jk_06840',
    inwardNumber: '06840',
    name: 'JWARI',
    brand: 'MANIK',
    batchNumber: 'JKT-01',
    category: 'Grains',
    description: 'Storage Item',
    rentalRate: 0.45,
    rentalCycles: ['monthly'],
    inwardQuantity: 101,
    outwardQuantity: 0,
    quantityAvailable: 101,
    unit: 'bags',
    inwardWeight: 3030.00,
    outwardWeight: 0,
    balanceWeight: 3030.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2025-04-09'),
    temperatureRange: 'Ambient',
    vendorId: 'vendor_01',
    clientId: 'cust_01',
    chamberId: 'chamber_01',
    images: [],
    condition: 'New'
  },
  {
    id: 'jk_06856',
    inwardNumber: '06856',
    name: 'JWARI',
    brand: 'MANIK',
    batchNumber: 'JKT-02',
    category: 'Grains',
    description: 'Storage Item',
    rentalRate: 0.45,
    rentalCycles: ['monthly'],
    inwardQuantity: 114,
    outwardQuantity: 0,
    quantityAvailable: 114,
    unit: 'bags',
    inwardWeight: 3420.00,
    outwardWeight: 0,
    balanceWeight: 3420.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2025-04-12'),
    temperatureRange: 'Ambient',
    vendorId: 'vendor_01',
    clientId: 'cust_01',
    chamberId: 'chamber_01',
    images: [],
    condition: 'New'
  },
  {
    id: 'jk_06863',
    inwardNumber: '06863',
    name: 'JWARI',
    brand: 'MANIK',
    batchNumber: 'JKT-03',
    category: 'Grains',
    description: 'Storage Item',
    rentalRate: 0.45,
    rentalCycles: ['monthly'],
    inwardQuantity: 52,
    outwardQuantity: 50,
    quantityAvailable: 2,
    unit: 'bags',
    inwardWeight: 1560.00,
    outwardWeight: 1500.00,
    balanceWeight: 60.00,
    expiryDate: new Date('2026-12-31'),
    storageDate: new Date('2025-04-13'),
    temperatureRange: 'Ambient',
    vendorId: 'vendor_01',
    clientId: 'cust_01',
    chamberId: 'chamber_01',
    images: [],
    condition: 'New'
  }
];

export const outwardEntries: OutwardEntry[] = [
  {
    id: 'out_01',
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
  },
  {
    id: 'out_02',
    outwardNumber: '24638',
    outwardDate: new Date('2026-01-14'),
    clientId: 'cust_03',
    inwardNumber: '07994',
    itemName: 'WHIIP CREAM',
    brand: 'PEARL',
    quantity: 3,
    weight: 36.00,
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
  },
  {
    id: 'do_24638',
    orderNumber: '24638',
    date: new Date('2026-01-14'),
    clientId: 'cust_03',
    address: 'PUNE',
    remark: '',
    driverName: 'AKSHAY',
    vehicleNumber: 'MH12 TN5281',
    gatePassNumber: '01946',
    items: [
      {
        srNo: 1,
        itemName: 'WHIIP CREAM',
        inwardNumber: '07994',
        brand: 'PEARL',
        quantity: 3,
        unit: 'BOX',
        weight: 36.00,
        balanceQty: 0,
        balanceWeight: 0
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
    ],
    boxDimensions: { length: 800, width: 600, height: 300 }
  }
];

export const gatePasses: GatePass[] = [];

export const invoices: Invoice[] = [
    {
        id: 'inv_02163',
        invoiceNumber: '02163',
        clientId: 'cust_03',
        date: new Date('2026-02-05'),
        dueDate: new Date('2026-02-20'),
        items: [
            { itemId: 'item_sheetal_07362', name: 'WHIIP CREAM (DECOR)', quantity: 5, rate: 1500, amount: 90 },
            { itemId: 'item_sheetal_07994', name: 'WHIIP CREAM (PEARL)', quantity: 3, rate: 1500, amount: 54 },
            { itemId: 'item_sheetal_08152', name: 'WHIIP CREAM (PEARL)', quantity: 30, rate: 1500, amount: 540 },
            { itemId: 'item_sheetal_08213', name: 'WHIIP CREAM (DECOR)', quantity: 100, rate: 1500, amount: 1800 },
            { itemId: 'item_sheetal_08213_choco', name: 'CHOCO TRAPHAL (DECOR)', quantity: 20, rate: 1500, amount: 360 },
        ],
        subtotal: 3576.56, // Taxable amount
        tax: 643.78, // 321.89 + 321.89
        total: 4220,
        paidAmount: 0,
        balance: 4220,
        status: 'Pending'
    },
    {
        id: 'inv_jk_02151',
        invoiceNumber: '02151',
        clientId: 'cust_01',
        date: new Date('2026-02-05'),
        dueDate: new Date('2026-02-20'),
        items: [
            { itemId: 'jk_06840', name: 'JWARI (MANIK)', quantity: 101, rate: 0.45, amount: 1363.50 },
            { itemId: 'jk_06856', name: 'JWARI (MANIK)', quantity: 114, rate: 0.45, amount: 1539.00 },
            { itemId: 'jk_06863', name: 'JWARI (MANIK)', quantity: 52, rate: 0.45, amount: 702.00 },
            { itemId: 'jk_07106', name: 'WHEAT (LOCAL)', quantity: 20, rate: 0.45, amount: 270.00 },
        ],
        subtotal: 3874.50,
        tax: 697.41,
        total: 4571.91,
        paidAmount: 0,
        balance: 4571.91,
        status: 'Pending'
    }
];
