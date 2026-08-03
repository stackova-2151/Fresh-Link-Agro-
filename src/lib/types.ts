import type { StaticImageData } from 'next/image';

export type UserRole = 'MASTER_ADMIN' | 'ADMIN' | 'SUB_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type User = {
  id: string;          // Firestore document ID (= Firebase Auth UID after migration)
  uid?: string;        // Firebase Auth UID — same as id after migration
  name: string;
  username?: string;
  email?: string;
  mobile?: string;
  password?: string;   // Legacy only — NOT stored in Firestore, kept for localStorage compat during migration
  avatar?: string;
  role: UserRole;
  status?: UserStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Vendor = {
  id: string;
  name: string;
};

export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  optionalPhone?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  bankDetails?: {
    accountName: string;
    bankName: string;
    accountNo: string;
    ifsc: string;
  };
  billingCycle: 'weekly' | 'monthly';
  rentAmount: number;
  pendingPayment: number;
};

export type RentalItem = {
  id: string;
  inwardNumber: string;
  name: string;
  brand: string;
  batchNumber: string;
  category: string;
  description: string;
  rentalRate: number;
  rentalCycles: ('daily' | 'weekly' | 'monthly')[];
  inwardQuantity: number;
  outwardQuantity: number;
  quantityAvailable: number; // Balance Qty
  unit: string;
  inwardWeight: number;
  outwardWeight: number;
  balanceWeight: number;
  expiryDate: Date;
  storageDate: Date;
  temperatureRange: string;
  vendorId: string;
  clientId: string;
  chamberId?: string;
  block?: string;
  zone?: string;
  driverName?: string;
  vehicleNumber?: string;
  boxDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  images: (string | StaticImageData)[];
  condition: 'New' | 'Good' | 'Used';
};

export type OutwardEntry = {
  id: string;
  outwardNumber: string;
  outwardDate: Date;
  clientId: string;
  inwardNumber: string; // Reference
  itemName: string;
  brand: string;
  quantity: number;
  weight: number;
  driverName: string;
  vehicleNumber: string;
};

export type DeliveryOrder = {
  id: string;
  orderNumber: string; // Out No
  date: Date;
  clientId: string;
  address: string;
  remark?: string;
  driverName: string;
  vehicleNumber: string;
  gatePassNumber: string;
  items: {
    srNo: number;
    itemName: string;
    inwardNumber: string;
    brand: string;
    quantity: number;
    unit: string;
    weight: number;
    balanceQty: number;
    balanceWeight: number;
  }[];
};

export type GoodsReceiptNote = {
  id: string;
  grnNumber: string;
  inwardNumber: string;
  date: Date;
  clientId: string;
  address: string;
  remark?: string;
  driverName: string;
  vehicleNumber: string;
  gatePassNumber: string;
  items: {
    srNo: number;
    itemName: string;
    brand: string;
    batchNumber: string;
    unit: string;
    weightPerQty: number;
    quantity: number;
    weight: number;
  }[];
};

export type Platform = 'WedMeGood' | 'Urban Company' | 'Internal';

export type StockTransaction = {
  id: string;
  product: RentalItem;
  transactionType: 'IN' | 'OUT';
  quantity: number;
  reference: string;
  timestamp: Date;
  user: User;
  notes: string;
  platform: Platform;
  unit: 'kg' | 'units' | 'liters' | 'bags';
};

export type Chamber = {
  id: string;
  name: string;
  temperature: string;
  dailyRentRate?: number;
  contactPerson?: string;
  contactNumber?: string;
  address?: string;
  isActive: boolean;
  products: Pick<RentalItem, 'id' | 'name' | 'quantityAvailable' | 'unit'>[];
  boxDimensions?: {
    length: number;
    width: number;
    height: number;
  };
};

export type GatePass = {
  id: string;
  gatePassNumber: string;
  type: 'IN' | 'OUT';
  entryTime: Date;
  exitTime?: Date;
  dockTime?: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  clientName: string;
  vendorId?: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  inboundTemperature: number;
  outboundTemperature?: number;
  dockNumber?: 1 | 2 | 3 | 4 | 5;
  status: 'Pending' | 'Approved' | 'On-Premises' | 'Completed';
  notes?: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  date: Date;
  dueDate: Date;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: 'Pending' | 'Paid' | 'Overdue';
};

export type CustomerRate = {
  id: string;
  clientId: string;
  itemDescription: string;
  rentPer: string;
  ratePer: string;
  rate: number;
  loadingPer: string;
  loading: number;
  loadingRatePer: string;
  hsnCode: string;
  gstRate: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GeneratedBill = {
  id: string;
  billNumber: string;
  clientId: string;
  clientName: string;
  clientGstNumber?: string;
  clientAddress?: string;
  billMonth: string; // Format: "YYYY-MM"
  monthEndDate: string; // ISO date string
  gstDate: string; // ISO date string
  billDate: string; // ISO date string
  items: {
    inwardNo: string;
    inwardDate: string;
    itemDescription: string;
    openingQty: number;
    openingWeight: number;
    rate: number;
    issuesQty: number;
    issuesWeight: number;
    outDetailDate: string | null;
    closingQty: number;
    closingWeight: number;
    amount: number;
    hsnCode: string;
    gstRate: number;
  }[];
  grossAmount: number;
  varai: number;
  uL: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  netAmount: number;
  amountInWords: string;
  createdAt: string;
  updatedAt: string;
  lastCalculatedAt?: string; // Timestamp of last recalculation
  createdBy: string;
  // New fields for enhanced charge tracking
  charges?: Array<{
    type: string;
    name: string;
    amount: number;
    description: string;
  }>;
  hasInwardThisMonth?: boolean;
  inwardCount?: number;
};