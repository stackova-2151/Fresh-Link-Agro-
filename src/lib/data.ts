import type { RentalItem, StockTransaction, Chamber, GatePass, User, Vendor, Customer } from '@/lib/types';

export const users: User[] = [
  { id: 'user_01', name: 'Alex', email: 'alex@example.com', role: 'Manager' },
  { id: 'user_02', name: 'Maria', email: 'maria@example.com', role: 'Store Keeper' },
  { id: 'user_03', name: 'Chen', email: 'chen@example.com', role: 'Gate Keeper' }
];

export const vendors: Vendor[] = [
    { id: 'vendor_01', name: 'Global Foods Inc.' },
    { id: 'vendor_02', name: 'Fresh Produce Co.' }
];

export const customers: Customer[] = [
    { id: 'cust_01', name: 'Prestige Catering', billingCycle: 'monthly', rentAmount: 50000, pendingPayment: 10000 },
    { id: 'cust_02', name: 'Royal Orchid Hotels', billingCycle: '15-day', rentAmount: 25000, pendingPayment: 0 },
];

export const rentalItems: RentalItem[] = [
  {
    id: 'item_007',
    name: 'Gourmet Cheese Platter',
    category: 'Food',
    description: 'Assortment of fine cheeses, crackers, fruits',
    rentalRate: 1200,
    rentalCycles: ['weekly', 'monthly'],
    quantityAvailable: 15,
    condition: 'New',
    images: ['/placeholder-images/cheese-platter.jpg'],
    unit: 'kg',
    expiryDate: new Date('2024-12-31'),
    temperatureRange: '2-8°C',
    vendorId: 'vendor_01'
  },
  {
    id: 'item_008',
    name: 'Fresh Strawberries',
    category: 'Food',
    description: 'Premium organic strawberries',
    rentalRate: 800,
    rentalCycles: ['daily', 'weekly'],
    quantityAvailable: 50,
    condition: 'New',
    images: ['/placeholder-images/strawberries.jpg'],
    unit: 'kg',
    expiryDate: new Date('2024-11-30'),
    temperatureRange: '0-4°C',
    vendorId: 'vendor_02'
  },
  {
    id: 'item_009',
    name: 'Frozen Seafood Mix',
    category: 'Food',
    description: 'Assorted frozen seafood',
    rentalRate: 1500,
    rentalCycles: ['monthly'],
    quantityAvailable: 20,
    condition: 'Good',
    images: ['/placeholder-images/seafood-mix.jpg'],
    unit: 'kg',
    expiryDate: new Date('2025-06-30'),
    temperatureRange: '-18°C',
    vendorId: 'vendor_01'
  },
  {
    id: 'item_010',
    name: 'Artisanal Ice Cream',
    category: 'Food',
    description: 'Hand-crafted vanilla bean ice cream',
    rentalRate: 950,
    rentalCycles: ['weekly'],
    quantityAvailable: 30,
    condition: 'New',
    images: [],
    unit: 'liters',
    expiryDate: new Date('2025-02-28'),
    temperatureRange: '-20°C',
    vendorId: 'vendor_02'
  },
];

export const transactions: StockTransaction[] = [
  {
    id: 'txn_001',
    product: rentalItems[0], // Cheese Platter
    transactionType: 'OUT',
    quantity: 2,
    reference: 'Rental #RC-101',
    timestamp: new Date('2024-07-15T10:00:00Z'),
    user: users[0],
    notes: 'Rented for wedding event',
    platform: 'WedMeGood',
    unit: 'kg'
  },
  {
    id: 'txn_002',
    product: rentalItems[1], // Strawberries
    transactionType: 'IN',
    quantity: 10,
    reference: 'Return #RT-045',
    timestamp: new Date('2024-07-14T14:30:00Z'),
    user: users[1],
    notes: 'Returned from catering company',
    platform: 'Urban Company',
    unit: 'kg'
  }
];

export const chambers: Chamber[] = [
  {
    id: 'chamber_01',
    name: 'Chamber A',
    capacity: 1000,
    occupied: 750,
    temperature: '2-8°C',
    isActive: true,
    dailyRentRate: 500,
    products: [
        { id: 'item_007', name: 'Gourmet Cheese Platter', quantityAvailable: 5, unit: 'kg' },
        { id: 'item_008', name: 'Fresh Strawberries', quantityAvailable: 20, unit: 'kg' },
    ],
  },
  {
    id: 'chamber_02',
    name: 'Chamber B',
    capacity: 500,
    occupied: 200,
    temperature: '-18°C',
    isActive: true,
    dailyRentRate: 750,
    products: [
        { id: 'item_009', name: 'Frozen Seafood Mix', quantityAvailable: 10, unit: 'kg' },
        { id: 'item_010', name: 'Artisanal Ice Cream', quantityAvailable: 15, unit: 'liters' },
    ],
  },
  { id: 'chamber_03', name: 'Chamber C', capacity: 2000, occupied: 1200, temperature: '0-5°C', isActive: true, dailyRentRate: 400, products: [], },
  { id: 'chamber_04', name: 'Chamber D', capacity: 5000, occupied: 4500, temperature: '15-20°C', isActive: false, dailyRentRate: 200, products: [], },
  { id: 'chamber_05', name: 'Chamber E', capacity: 1000, occupied: 0, temperature: '2-8°C', isActive: true, dailyRentRate: 500, products: [], },
  { id: 'chamber_06', name: 'Chamber F', capacity: 1000, occupied: 0, temperature: '-18°C', isActive: true, dailyRentRate: 750, products: [], },
  { id: 'chamber_07', name: 'Chamber G', capacity: 1500, occupied: 0, temperature: '0-5°C', isActive: true, dailyRentRate: 450, products: [], },
  { id: 'chamber_08', name: 'Chamber H', capacity: 1500, occupied: 0, temperature: '0-5°C', isActive: true, dailyRentRate: 450, products: [], },
  { id: 'chamber_09', name: 'Chamber I', capacity: 800, occupied: 0, temperature: '2-8°C', isActive: true, dailyRentRate: 550, products: [], },
  { id: 'chamber_10', name: 'Chamber J', capacity: 800, occupied: 0, temperature: '-20°C', isActive: true, dailyRentRate: 800, products: [], },
  { id: 'chamber_11', name: 'Chamber K', capacity: 2500, occupied: 0, temperature: '0-5°C', isActive: true, dailyRentRate: 400, products: [], },
  { id: 'chamber_12', name: 'Chamber L', capacity: 2500, occupied: 0, temperature: '0-5°C', isActive: true, dailyRentRate: 400, products: [], },
  { id: 'chamber_13', name: 'Chamber M', capacity: 1200, occupied: 0, temperature: '2-8°C', isActive: true, dailyRentRate: 500, products: [], },
  { id: 'chamber_14', name: 'Chamber N', capacity: 1200, occupied: 0, temperature: '-18°C', isActive: true, dailyRentRate: 750, products: [], },
  { id: 'chamber_15', name: 'Chamber O', capacity: 3000, occupied: 0, temperature: '0-5°C', isActive: true, dailyRentRate: 400, products: [], },
  { id: 'chamber_16', name: 'Chamber P', capacity: 3000, occupied: 0, temperature: '15-20°C', isActive: true, dailyRentRate: 250, products: [], },
  { id: 'chamber_17', name: 'Chamber Q', capacity: 1000, occupied: 0, temperature: '-25°C', isActive: true, dailyRentRate: 900, products: [], },
  { id: 'chamber_18', name: 'Chamber R', capacity: 1000, occupied: 0, temperature: '2-8°C', isActive: true, dailyRentRate: 500, products: [], },
];

export const gatePasses: GatePass[] = [
  {
    id: 'gp_001',
    gatePassNumber: 'GP-2407-001',
    type: 'IN',
    entryTime: new Date(new Date().setHours(9, 15, 0, 0)),
    vehicleNumber: 'MH12 AB1234',
    driverName: 'Ramesh Patel',
    driverPhone: '9876543210',
    customerName: 'Prestige Catering',
    items: [{ name: 'Vegetable Mix', quantity: 200, unit: 'kg' }],
    inboundTemperature: 4.5,
    status: 'On-Premises',
    notes: 'Scheduled delivery for A-1',
    dockNumber: 1,
  },
  {
    id: 'gp_002',
    gatePassNumber: 'GP-2407-002',
    type: 'OUT',
    entryTime: new Date(new Date().setHours(8, 30, 0, 0)),
    exitTime: new Date(new Date().setHours(10, 5, 0, 0)),
    vehicleNumber: 'KA05 CD5678',
    driverName: 'Suresh Kumar',
    driverPhone: '9876543211',
    customerName: 'Royal Orchid Hotels',
    items: [{ name: 'Gourmet Cheese Platter', quantity: 10, unit: 'kg' }],
    inboundTemperature: 5.1,
    outboundTemperature: 5.2,
    status: 'Completed',
    dockNumber: 3,
  },
  {
    id: 'gp_003',
    gatePassNumber: 'GP-2407-003',
    type: 'IN',
    entryTime: new Date(new Date().setHours(11, 45, 0, 0)),
    vehicleNumber: 'TN07 EF9012',
    driverName: 'Maria D-Souza',
    driverPhone: '9876543212',
    customerName: 'Daily Fresh',
    items: [{ name: 'Fresh Strawberries', quantity: 50, unit: 'kg' }],
    inboundTemperature: 3.9,
    status: 'On-Premises',
    dockNumber: 2,
  },
  {
    id: 'gp_004',
    gatePassNumber: 'GP-2407-004',
    type: 'IN',
    entryTime: new Date(new Date(new Date().setDate(new Date().getDate()-1)).setHours(16, 0, 0, 0)),
    vehicleNumber: 'DL10 GH3456',
    driverName: 'Vikram Singh',
    driverPhone: '9876543213',
    customerName: 'Iceberg Inc.',
    items: [{ name: 'Frozen Seafood Mix', quantity: 150, unit: 'kg' }],
    inboundTemperature: -17.8,
    status: 'On-Premises',
    dockNumber: 5,
  }
];
