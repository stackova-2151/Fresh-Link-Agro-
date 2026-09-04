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
  deleteField,
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
  CustomerRate,
  GeneratedBill,
} from '@/lib/types';
import type { EntryApprovalRequest } from '@/lib/types/approval';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
}

// Recursively detect undefined fields in an object
function detectUndefinedFields(obj: unknown, path: string = ''): string[] {
  const undefinedPaths: string[] = [];
  
  if (obj === undefined) {
    undefinedPaths.push(path);
    return undefinedPaths;
  }
  
  if (obj === null || typeof obj !== 'object') {
    return undefinedPaths;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPath = path ? `${path}[${index}]` : `[${index}]`;
      undefinedPaths.push(...detectUndefinedFields(item, itemPath));
    });
  } else {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const value = (obj as Record<string, unknown>)[key];
      const itemPath = path ? `${path}.${key}` : key;
      undefinedPaths.push(...detectUndefinedFields(value, itemPath));
    }
  }
  
  return undefinedPaths;
}

/**
 * Recursively remove undefined values from an object.
 * Preserves false, 0, '', null, Date, Timestamp, and other valid values.
 * Returns a new object without modifying the original.
 * 
 * This is used to sanitize data before sending to Firestore,
 * which does not accept undefined values.
 */
function sanitizeUndefinedValues<T>(obj: T): T {
  // Handle primitive types (including null)
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle undefined - this should not happen at top level
  // but we handle it recursively
  if (obj === undefined) {
    return obj as T;
  }
  
  // Handle Date objects - preserve as-is
  if (obj instanceof Date) {
    return obj as T;
  }
  
  // Handle Timestamp objects - preserve as-is
  if (obj instanceof Timestamp) {
    return obj as T;
  }
  
  // Handle arrays - recursively sanitize each element
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeUndefinedValues(item)) as T;
  }
  
  // Handle objects - recursively sanitize each property
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const value = (obj as Record<string, unknown>)[key];
    
    // Skip undefined values entirely
    if (value === undefined) {
      continue;
    }
    
    // Recursively sanitize nested values
    result[key] = sanitizeUndefinedValues(value);
  }
  
  return result as T;
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
  return snap.docs.map((d) => convertTimestamps<T>({ ...d.data(), id: d.id }));
}

async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return convertTimestamps<T>({ ...snap.data(), id: snap.id });
}

async function getWhere<T>(
  collectionName: string,
  field: string,
  op: WhereFilterOp,
  value: unknown
): Promise<T[]> {
  const q = query(collection(db, collectionName), where(field, op, value));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertTimestamps<T>({ ...d.data(), id: d.id }));
}

async function create<T extends { id?: string }>(
  collectionName: string,
  data: Omit<T, 'id'>
): Promise<T> {
  const { id, ...dataToStore } = data as any;
  const undefinedFields = detectUndefinedFields(dataToStore);
  if (undefinedFields.length > 0) {
    throw new Error(`Undefined fields in create payload: ${undefinedFields.join(', ')}`);
  }
  const ref = await addDoc(collection(db, collectionName), dataToStore);
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
  const { id: idToRemove, ...dataToUpdate } = data as any;
  const undefinedFields = detectUndefinedFields(dataToUpdate);
  if (undefinedFields.length > 0) {
    throw new Error(`Undefined fields in update payload: ${undefinedFields.join(', ')}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, collectionName, id), dataToUpdate);
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

// ── Customer Rates ─────────────────────────────────────────────────────────────

export const customerRatesService = {
  getAll: () => getAll<CustomerRate>('customerRates'),
  getById: (id: string) => getById<CustomerRate>('customerRates', id),
  getByClient: (clientId: string) =>
    getWhere<CustomerRate>('customerRates', 'clientId', '==', clientId),
  create: (data: Omit<CustomerRate, 'id'>) => create<CustomerRate>('customerRates', data),
  createWithId: (data: CustomerRate) => createWithId<CustomerRate>('customerRates', data),
  update: (id: string, data: Partial<CustomerRate>) =>
    update<CustomerRate>('customerRates', id, data),
  delete: (id: string) => remove('customerRates', id),
  deleteByClient: async (clientId: string) => {
    const rates = await getWhere<CustomerRate>('customerRates', 'clientId', '==', clientId);
    await Promise.all(rates.map((rate) => remove('customerRates', rate.id)));
  },
};

// ── Generated Bills ────────────────────────────────────────────────────────────

export const generatedBillsService = {
  getAll: () => getAll<GeneratedBill>('generatedBills'),
  getById: (id: string) => getById<GeneratedBill>('generatedBills', id),
  getByClient: (clientId: string) => getWhere<GeneratedBill>('generatedBills', 'clientId', '==', clientId),
  getByClientAndMonth: (clientId: string, billMonth: string) =>
    getWhere<GeneratedBill>('generatedBills', 'clientId', '==', clientId).then((bills) =>
      bills.filter((b) => b.billMonth === billMonth)
    ),
  getByMonth: (billMonth: string) => getWhere<GeneratedBill>('generatedBills', 'billMonth', '==', billMonth),
  create: (data: Omit<GeneratedBill, 'id'>) => create<GeneratedBill>('generatedBills', data),
  createWithId: (data: GeneratedBill) => createWithId<GeneratedBill>('generatedBills', data),
  update: (id: string, data: Partial<GeneratedBill>) => update<GeneratedBill>('generatedBills', id, data),
  delete: (id: string) => remove('generatedBills', id),
  deleteByClient: async (clientId: string) => {
    const bills = await getWhere<GeneratedBill>('generatedBills', 'clientId', '==', clientId);
    await Promise.all(bills.map((bill) => remove('generatedBills', bill.id)));
  },
  /**
   * Migration function to remove 'id' field from existing generatedBills documents
   * This is a one-time migration to clean up documents created before the runtime removal fix
   */
  migrateRemoveIdField: async () => {
    console.log('[MIGRATION] Starting migration to remove id field from generatedBills documents...');
    
    try {
      const snap = await getDocs(collection(db, 'generatedBills'));
      console.log('[MIGRATION] Total documents to check:', snap.docs.length);
      
      let migratedCount = 0;
      let skippedCount = 0;
      
      for (const docSnap of snap.docs) {
        const docData = docSnap.data();
        
        // Check if document has id field in data
        if ('id' in docData) {
          console.log('[MIGRATION] Found document with id field:', docSnap.id);
          console.log('[MIGRATION]   Current id value:', docData.id);
          
          // Remove id field using deleteField
          await updateDoc(doc(db, 'generatedBills', docSnap.id), {
            id: deleteField()
          });
          
          console.log('[MIGRATION]   Removed id field from document');
          migratedCount++;
        } else {
          skippedCount++;
        }
      }
      
      console.log('[MIGRATION] Migration completed');
      console.log('[MIGRATION]   Migrated documents:', migratedCount);
      console.log('[MIGRATION]   Skipped documents (no id field):', skippedCount);
      
      return { migratedCount, skippedCount };
    } catch (error) {
      console.error('[MIGRATION] Migration failed:', error);
      throw error;
    }
  },
};

// ── Entry Approval Requests ─────────────────────────────────────────────────────

export const entryApprovalRequestsService = {
  getAll: () => getAll<EntryApprovalRequest>('entryApprovalRequests'),
  getById: (id: string) => getById<EntryApprovalRequest>('entryApprovalRequests', id),
  getByStatus: (status: EntryApprovalRequest['status']) =>
    getWhere<EntryApprovalRequest>('entryApprovalRequests', 'status', '==', status),
  getByEntry: (entryId: string) =>
    getWhere<EntryApprovalRequest>('entryApprovalRequests', 'entryId', '==', entryId),
  getByEntryAndStatus: (entryId: string, status: EntryApprovalRequest['status']) => {
    const q = query(
      collection(db, 'entryApprovalRequests'),
      where('entryId', '==', entryId),
      where('status', '==', status)
    );
    return getDocs(q).then((snap) =>
      snap.docs.map((d) => convertTimestamps<EntryApprovalRequest>({ ...d.data(), id: d.id }))
    );
  },
  create: (data: Omit<EntryApprovalRequest, 'id'>) => {
    // Sanitize undefined values before creating approval request
    // This handles historical vouchers that may not have audit fields
    const sanitizedData = sanitizeUndefinedValues(data);
    return create<EntryApprovalRequest>('entryApprovalRequests', sanitizedData);
  },
  createWithId: (data: EntryApprovalRequest) => createWithId<EntryApprovalRequest>('entryApprovalRequests', data),
  update: (id: string, data: Partial<EntryApprovalRequest>) =>
    update<EntryApprovalRequest>('entryApprovalRequests', id, data),
  delete: (id: string) => remove('entryApprovalRequests', id),
};

// Export sanitizer for potential use in other contexts
export { sanitizeUndefinedValues };
