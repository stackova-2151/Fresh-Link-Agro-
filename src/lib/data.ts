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
  },
  {
    id: 'out_03',
    outwardNumber: '24709',
    outwardDate: new Date('2026-01-19'),
    clientId: 'cust_03',
    inwardNumber: '08213',
    itemName: 'WHIIP CREAM',
    brand: 'DECOR',
    quantity: 40,
    weight: 480.00,
    driverName: 'JITESH',
    vehicleNumber: 'MH12 YQ7941'
  },
  {
    id: 'out_06',
    outwardNumber: '24638',
    outwardDate: new Date('2026-01-14'),
    clientId: 'cust_03',
    inwardNumber: '08152',
    itemName: 'WHIIP CREAM',
    brand: 'PEARL',
    quantity: 10,
    weight: 120.00,
    driverName: 'AKSHAY',
    vehicleNumber: 'MH12 TN5281'
  },
  {
    id: 'out_07',
    outwardNumber: '24638',
    outwardDate: new Date('2026-01-14'),
    clientId: 'cust_03',
    inwardNumber: '08213',
    itemName: 'WHIIP CREAM',
    brand: 'DECOR',
    quantity: 10,
    weight: 120.00,
    driverName: 'AKSHAY',
    vehicleNumber: 'MH12 TN5281'
  }
];

export const deliveryOrders: DeliveryOrder[] = [
  {
    id: 'do_03',
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
    id: 'do_02',
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
      },
      {
        srNo: 2,
        itemName: 'WHIIP CREAM',
        inwardNumber: '08152',
        brand: 'PEARL',
        quantity: 10,
        unit: 'BOX',
        weight: 120.00,
        balanceQty: 0,
        balanceWeight: 0
      },
      {
        srNo: 3,
        itemName: 'WHIIP CREAM',
        inwardNumber: '08213',
        brand: 'DECOR',
        quantity: 10,
        unit: 'BOX',
        weight: 120.00,
        balanceQty: 90,
        balanceWeight: 1080.00
      }
    ]
  },
  {
    id: 'do_01',
    orderNumber: '24709',
    date: new Date('2026-01-19'),
    clientId: 'cust_03',
    address: 'PUNE',
    remark: '',
    driverName: 'JITESH',
    vehicleNumber: 'MH12 YQ7941',
    gatePassNumber: '09808',
    items: [
      {
        srNo: 1,
        itemName: 'WHIIP CREAM',
        inwardNumber: '08213',
        brand: 'DECOR',
        quantity: 40,
        unit: 'BOX',
        weight: 480.00,
        balanceQty: 50,
        balanceWeight: 600.00
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
      },
      {
        srNo: 2,
        itemName: 'CHOCO TRAPHAL',
        brand: '',
        batchNumber: '',
        unit: 'BOX',
        weightPerQty: 12,
        quantity: 20,
        weight: 240.00
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
        id: 'inv_01',
        invoiceNumber: 'INV-2026-001',
        clientId: 'cust_03',
        date: new Date('2026-01-31'),
        dueDate: new Date('2026-02-15'),
        items: [
            { itemId: 'item_sheetal_01', name: 'Storage: WHIIP CREAM', quantity: 100, rate: 2.5, amount: 7500 },
        ],
        subtotal: 9300,
        tax: 1674,
        total: 10974,
        paidAmount: 0,
        balance: 10974,
        status: 'Pending'
    }
];