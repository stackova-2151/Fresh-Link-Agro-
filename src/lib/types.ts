import type { StaticImageData } from 'next/image';

export type User = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: 'Admin' | 'Gatekeeper' | 'Storekeeper';
};

export type Vendor = {
  id: string;
  name: string;
};

export type Client = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  billingCycle: 'weekly' | 'monthly';
  rentAmount: number;
  pendingPayment: number;
};

export type RentalItem = {
  id:string;
  name:string;
  category:string;
  description:string;
  rentalRate:number;
  rentalCycles:('daily' | 'weekly' | 'monthly')[];
  quantityAvailable:number;
  condition:'New' | 'Good' | 'Used';
  images:(string | StaticImageData)[];
  unit:'kg' | 'units' | 'liters' | 'weights';
  expiryDate:Date;
  storageDate: Date;
  temperatureRange:string;
  vendorId:string; // To link to a vendor
  clientId:string; // To link to a client
  chamberId?:string; // To link to a chamber
  boxDimensions?:{
    length:number;
    width:number;
    height:number;
  };
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
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  clientName: string; // Or clientId
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
