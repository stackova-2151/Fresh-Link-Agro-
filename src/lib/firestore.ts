import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  type WhereFilterOp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  Client,
  RentalItem,
  OutwardEntry,
  DeliveryOrder,
  GoodsReceiptNote,
  Chamber,
  GatePass,
  Invoice,
  Vendor,
} from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
}

// Recursively convert Timestamps to Dates in a plain object
function convertTimestamps<T>(data: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val instanceof Timestamp) {
      result[key] = val.toDate();
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? convertTimestamps(item as Record<string, unknown>)
          : item
      );
    } else if (val && typeof val === 'object' && !(val instanceof Date)) {
      result[key] = convertTimestamps(val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

async function getAll<T>(collectionName: string): Promise<T[]> {
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map((d) => convertTimestamps<T>({ id: d.id, ...d.data() }));
}

async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return convertTimestamps<T>({ id: snap.id, ...snap.data() });
}

async function getWhere<T>(
  collectionName: string,
  field: string,
  op: WhereFilterOp,
  value: unknown
): Promise<T[]> {
  const q = query(collection(db, collectionName), where(field, op, value));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamps<T>({ id: d.id, ...d.data() }));
}

async function create<T extends { id?: string }>(
  collectionName: string,
  data: Omit<T, 'id'>
): Promise<T> {
  const ref = await addDoc(collection(db, collectionName), data);
  return { id: ref.id, ...data } as T;
}

async function createWithId<T extends { id: string }>(
  collectionName: string,
  data: T
): Promise<T> {
  const { id, ...rest } = data;
  await setDoc(doc(db, collectionName, id), rest);
  return data;
}

async function update<T>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, collectionName, id), data as any);
}

async function remove(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

// ── Clients ───────────────────────────────────────────────────────────────────

export const clientsService = {
  getAll: () => getAll<Client>('clients'),
  getById: (id: string) => getById<Client>('clients', id),
  create: (data: Omit<Client, 'id'>) => create<Client>('clients', data),
  createWithId: (data: Client) => createWithId<Client>('clients', data),
  update: (id: string, data: Partial<Client>) => update<Client>('clients', id, data),
  delete: (id: string) => remove('clients', id),
};

// ── Vendors ───────────────────────────────────────────────────────────────────

export const vendorsService = {
  getAll: () => getAll<Vendor>('vendors'),
  getById: (id: string) => getById<Vendor>('vendors', id),
  create: (data: Omit<Vendor, 'id'>) => create<Vendor>('vendors', data),
  createWithId: (data: Vendor) => createWithId<Vendor>('vendors', data),
  update: (id: string, data: Partial<Vendor>) => update<Vendor>('vendors', id, data),
  delete: (id: string) => remove('vendors', id),
};

// ── Rental Items (Inward Register) ────────────────────────────────────────────

export const rentalItemsService = {
  getAll: () => getAll<RentalItem>('rentalItems'),
  getById: (id: string) => getById<RentalItem>('rentalItems', id),
  getByClient: (clientId: string) => getWhere<RentalItem>('rentalItems', 'clientId', '==', clientId),
  getByInwardNumber: (inwardNumber: string) =>
    getWhere<RentalItem>('rentalItems', 'inwardNumber', '==', inwardNumber),
  create: (data: Omit<RentalItem, 'id'>) => create<RentalItem>('rentalItems', data),
  createWithId: (data: RentalItem) => createWithId<RentalItem>('rentalItems', data),
  update: (id: string, data: Partial<RentalItem>) => update<RentalItem>('rentalItems', id, data),
  delete: (id: string) => remove('rentalItems', id),
};

// ── Outward Entries ───────────────────────────────────────────────────────────

export const outwardService = {
  getAll: () => getAll<OutwardEntry>('outwardEntries'),
  getById: (id: string) => getById<OutwardEntry>('outwardEntries', id),
  getByClient: (clientId: string) =>
    getWhere<OutwardEntry>('outwardEntries', 'clientId', '==', clientId),
  create: (data: Omit<OutwardEntry, 'id'>) => create<OutwardEntry>('outwardEntries', data),
  createWithId: (data: OutwardEntry) => createWithId<OutwardEntry>('outwardEntries', data),
  update: (id: string, data: Partial<OutwardEntry>) =>
    update<OutwardEntry>('outwardEntries', id, data),
  delete: (id: string) => remove('outwardEntries', id),
};

// ── Delivery Orders ───────────────────────────────────────────────────────────

export const deliveryOrdersService = {
  getAll: () => getAll<DeliveryOrder>('deliveryOrders'),
  getById: (id: string) => getById<DeliveryOrder>('deliveryOrders', id),
  getByClient: (clientId: string) =>
    getWhere<DeliveryOrder>('deliveryOrders', 'clientId', '==', clientId),
  create: (data: Omit<DeliveryOrder, 'id'>) => create<DeliveryOrder>('deliveryOrders', data),
  createWithId: (data: DeliveryOrder) => createWithId<DeliveryOrder>('deliveryOrders', data),
  update: (id: string, data: Partial<DeliveryOrder>) =>
    update<DeliveryOrder>('deliveryOrders', id, data),
  delete: (id: string) => remove('deliveryOrders', id),
};

// ── Goods Receipt Notes ───────────────────────────────────────────────────────

export const grnService = {
  getAll: () => getAll<GoodsReceiptNote>('goodsReceiptNotes'),
  getById: (id: string) => getById<GoodsReceiptNote>('goodsReceiptNotes', id),
  getByClient: (clientId: string) =>
    getWhere<GoodsReceiptNote>('goodsReceiptNotes', 'clientId', '==', clientId),
  create: (data: Omit<GoodsReceiptNote, 'id'>) =>
    create<GoodsReceiptNote>('goodsReceiptNotes', data),
  createWithId: (data: GoodsReceiptNote) =>
    createWithId<GoodsReceiptNote>('goodsReceiptNotes', data),
  update: (id: string, data: Partial<GoodsReceiptNote>) =>
    update<GoodsReceiptNote>('goodsReceiptNotes', id, data),
  delete: (id: string) => remove('goodsReceiptNotes', id),
};

// ── Chambers ──────────────────────────────────────────────────────────────────

export const chambersService = {
  getAll: () => getAll<Chamber>('chambers'),
  getById: (id: string) => getById<Chamber>('chambers', id),
  create: (data: Omit<Chamber, 'id'>) => create<Chamber>('chambers', data),
  createWithId: (data: Chamber) => createWithId<Chamber>('chambers', data),
  update: (id: string, data: Partial<Chamber>) => update<Chamber>('chambers', id, data),
  delete: (id: string) => remove('chambers', id),
};

// ── Gate Passes ───────────────────────────────────────────────────────────────

export const gatePassService = {
  getAll: () => getAll<GatePass>('gatePasses'),
  getById: (id: string) => getById<GatePass>('gatePasses', id),
  getByStatus: (status: GatePass['status']) =>
    getWhere<GatePass>('gatePasses', 'status', '==', status),
  create: (data: Omit<GatePass, 'id'>) => create<GatePass>('gatePasses', data),
  createWithId: (data: GatePass) => createWithId<GatePass>('gatePasses', data),
  update: (id: string, data: Partial<GatePass>) => update<GatePass>('gatePasses', id, data),
  delete: (id: string) => remove('gatePasses', id),
};

// ── Invoices ──────────────────────────────────────────────────────────────────

export const invoicesService = {
  getAll: () => getAll<Invoice>('invoices'),
  getById: (id: string) => getById<Invoice>('invoices', id),
  getByClient: (clientId: string) =>
    getWhere<Invoice>('invoices', 'clientId', '==', clientId),
  getByStatus: (status: Invoice['status']) =>
    getWhere<Invoice>('invoices', 'status', '==', status),
  create: (data: Omit<Invoice, 'id'>) => create<Invoice>('invoices', data),
  createWithId: (data: Invoice) => createWithId<Invoice>('invoices', data),
  update: (id: string, data: Partial<Invoice>) => update<Invoice>('invoices', id, data),
  delete: (id: string) => remove('invoices', id),
};
