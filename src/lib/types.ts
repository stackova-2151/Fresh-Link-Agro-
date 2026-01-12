import type { StaticImageData } from 'next/image';

export type User = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: 'Admin' | 'Manager' | 'Gate Keeper' | 'Store Keeper' | 'Checker' | 'Accountant';
};

export type RentalItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  rentalRate: number;
  rentalCycles: ('daily' | 'weekly' | 'monthly')[];
  quantityAvailable: number;
  condition: 'New' | 'Good' | 'Used';
  images: (string | StaticImageData)[];
  unit: 'kg' | 'units' | 'liters';
  expiryDate: Date;
  temperatureRange: string;
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
  unit: 'kg' | 'units' | 'liters';
};

export type Chamber = {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  temperature: string;
  dailyRentRate?: number;
  contactPerson?: string;
  contactNumber?: string;
  address?: string;
  isActive: boolean;
  products: Pick<RentalItem, 'id' | 'name' | 'quantityAvailable' | 'unit'>[];
};

export type GatePass = {
  id: string;
  gatePassNumber: string;
  type: 'IN' | 'OUT';
  entryTime: Date;
  exitTime?: Date;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  customerName: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  temperature: number; // Vehicle temperature on entry/exit
  status: 'Pending' | 'Approved' | 'On-Premises' | 'Completed';
  notes?: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  contractId: string;
  customerId: string;
  date: Date;
  dueDate: Date;
  items: {
    name: string;
    quantity: number;
    rate: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: 'Pending' | 'Paid' | 'Overdue';
};
