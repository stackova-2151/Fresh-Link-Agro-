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
  console.log('[FIRESTORE-READ] getAll called for collection:', collectionName);
  const snap = await getDocs(collection(db, collectionName));
  console.log('[FIRESTORE-READ] Snapshot docs count:', snap.docs.length);
  
  const result = snap.docs.map((d) => {
    console.log('[FIRESTORE-READ] Processing document:');
    console.log('[FIRESTORE-READ]   doc.id:', d.id);
    console.log('[FIRESTORE-READ]   doc.data() keys:', Object.keys(d.data()));
    console.log('[FIRESTORE-READ]   doc.data().id:', d.data().id);
    console.log('[FIRESTORE-READ]   Mapping: { ...d.data(), id: d.id }');
    console.log('[FIRESTORE-READ]   Result: { ...data, id:', d.id, '}');
    return convertTimestamps<T>({ ...d.data(), id: d.id });
  });
  
  console.log('[FIRESTORE-READ] Returning mapped results with IDs:', result.map(r => (r as any).id));
  return result;
}

async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  console.log('[FIRESTORE-READ] getById called for collection:', collectionName);
  console.log('[FIRESTORE-READ] Requested document ID:', id);
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) {
    console.log('[FIRESTORE-READ] Document does not exist');
    return null;
  }
  console.log('[FIRESTORE-READ] Document exists');
  console.log('[FIRESTORE-READ]   snap.id:', snap.id);
  console.log('[FIRESTORE-READ]   snap.data() keys:', Object.keys(snap.data()));
  console.log('[FIRESTORE-READ]   snap.data().id:', snap.data().id);
  console.log('[FIRESTORE-READ]   Mapping: { ...snap.data(), id: snap.id }');
  const result = convertTimestamps<T>({ ...snap.data(), id: snap.id });
  console.log('[FIRESTORE-READ] Returning result with id:', (result as any).id);
  return result;
}

async function getWhere<T>(
  collectionName: string,
  field: string,
  op: WhereFilterOp,
  value: unknown
): Promise<T[]> {
  console.log('[FIRESTORE-READ] getWhere called for collection:', collectionName);
  console.log('[FIRESTORE-READ] Query:', field, op, value);
  const q = query(collection(db, collectionName), where(field, op, value));
  const snap = await getDocs(q);
  console.log('[FIRESTORE-READ] Snapshot docs count:', snap.docs.length);
  
  const result = snap.docs.map((d) => {
    console.log('[FIRESTORE-READ] Processing document:');
    console.log('[FIRESTORE-READ]   doc.id:', d.id);
    console.log('[FIRESTORE-READ]   doc.data() keys:', Object.keys(d.data()));
    console.log('[FIRESTORE-READ]   doc.data().id:', d.data().id);
    console.log('[FIRESTORE-READ]   Mapping: { ...d.data(), id: d.id }');
    console.log('[FIRESTORE-READ]   Result: { ...data, id:', d.id, '}');
    return convertTimestamps<T>({ ...d.data(), id: d.id });
  });
  
  console.log('[FIRESTORE-READ] Returning mapped results with IDs:', result.map(r => (r as any).id));
  return result;
}

async function create<T extends { id?: string }>(
  collectionName: string,
  data: Omit<T, 'id'>
): Promise<T> {
  console.log('[FIRESTORE-WRITE] create called for collection:', collectionName);
  console.log('[FIRESTORE-WRITE] Input data keys:', Object.keys(data));
  console.log('[FIRESTORE-WRITE] Input data.id:', (data as any).id);
  
  // Runtime removal of id field to prevent storing it in Firestore document
  const { id, ...dataToStore } = data as any;
  console.log('[FIRESTORE-WRITE] Data to be stored (WITHOUT id field):');
  console.log('[FIRESTORE-WRITE]', JSON.stringify(dataToStore, null, 2));
  
  const ref = await addDoc(collection(db, collectionName), dataToStore);
  console.log('[FIRESTORE-WRITE] Firestore assigned document ID:', ref.id);
  
  const result = { id: ref.id, ...data } as T;
  console.log('[FIRESTORE-WRITE] Returning result with id:', result.id);
  console.log('[FIRESTORE-WRITE] Full result:', JSON.stringify(result, null, 2));
  
  return result;
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
  console.log('[FIRESTORE-WRITE] update called for collection:', collectionName);
  console.log('[FIRESTORE-WRITE] Document ID to update:', id);
  console.log('[FIRESTORE-WRITE] Update data keys:', Object.keys(data));
  console.log('[FIRESTORE-WRITE] Update data:', JSON.stringify(data, null, 2));
  
  // Runtime removal of id field from update payload to prevent storing it in Firestore
  const { id: idToRemove, ...dataToUpdate } = data as any;
  console.log('[FIRESTORE-WRITE] Data to update (WITHOUT id field):');
  console.log('[FIRESTORE-WRITE]', JSON.stringify(dataToUpdate, null, 2));
  
  // Detect undefined fields in update payload
  console.log('[FIRESTORE-WRITE] Checking for undefined fields in update payload...');
  const undefinedFields = detectUndefinedFields(dataToUpdate);
  if (undefinedFields.length > 0) {
    console.error('[ERROR] Undefined fields detected in update payload:');
    undefinedFields.forEach(path => {
      console.error(`[ERROR]   ${path} = undefined`);
    });
    console.error('[ERROR] Firestore does not support undefined values');
    console.error('[ERROR] Fix the source code to replace undefined with null, empty string, 0, or remove the property');
    throw new Error(`Undefined fields in update payload: ${undefinedFields.join(', ')}`);
  }
  console.log('[FIRESTORE-WRITE] No undefined fields detected in update payload');
  
  console.log('[FIRESTORE-WRITE] Calling updateDoc with document reference');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, collectionName, id), dataToUpdate);
  
  console.log('[FIRESTORE-WRITE] Update completed successfully');
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
  getAll: () => {
    console.log('[GENERATED-BILLS-SERVICE] getAll called');
    return getAll<GeneratedBill>('generatedBills');
  },
  getById: (id: string) => {
    console.log('[GENERATED-BILLS-SERVICE] getById called with ID:', id);
    return getById<GeneratedBill>('generatedBills', id);
  },
  getByClient: (clientId: string) => {
    console.log('[GENERATED-BILLS-SERVICE] getByClient called with clientId:', clientId);
    return getWhere<GeneratedBill>('generatedBills', 'clientId', '==', clientId);
  },
  getByClientAndMonth: (clientId: string, billMonth: string) => {
    console.log('[GENERATED-BILLS-SERVICE] getByClientAndMonth called');
    console.log('[GENERATED-BILLS-SERVICE]   clientId:', clientId);
    console.log('[GENERATED-BILLS-SERVICE]   billMonth:', billMonth);
    return getWhere<GeneratedBill>('generatedBills', 'clientId', '==', clientId).then((bills) => {
      console.log('[GENERATED-BILLS-SERVICE] Bills before filter:', bills.length);
      console.log('[GENERATED-BILLS-SERVICE] Bills IDs before filter:', bills.map(b => b.id));
      const filtered = bills.filter((b) => b.billMonth === billMonth);
      console.log('[GENERATED-BILLS-SERVICE] Bills after filter:', filtered.length);
      console.log('[GENERATED-BILLS-SERVICE] Bills IDs after filter:', filtered.map(b => b.id));
      return filtered;
    });
  },
  getByMonth: (billMonth: string) => {
    console.log('[GENERATED-BILLS-SERVICE] getByMonth called with billMonth:', billMonth);
    return getWhere<GeneratedBill>('generatedBills', 'billMonth', '==', billMonth);
  },
  create: (data: Omit<GeneratedBill, 'id'>) => {
    console.log('[GENERATED-BILLS-SERVICE] create called');
    console.log('[GENERATED-BILLS-SERVICE] Input data keys:', Object.keys(data));
    console.log('[GENERATED-BILLS-SERVICE] Input data.id:', (data as any).id);
    console.log('[GENERATED-BILLS-SERVICE] Input data.billNumber:', (data as any).billNumber);
    return create<GeneratedBill>('generatedBills', data);
  },
  createWithId: (data: GeneratedBill) => {
    console.log('[GENERATED-BILLS-SERVICE] createWithId called');
    console.log('[GENERATED-BILLS-SERVICE] Input data.id:', data.id);
    return createWithId<GeneratedBill>('generatedBills', data);
  },
  update: (id: string, data: Partial<GeneratedBill>) => {
    console.log('[GENERATED-BILLS-SERVICE] update called');
    console.log('[GENERATED-BILLS-SERVICE] Document ID:', id);
    console.log('[GENERATED-BILLS-SERVICE] Update data keys:', Object.keys(data));
    console.log('[GENERATED-BILLS-SERVICE] Update data:', JSON.stringify(data, null, 2));
    return update<GeneratedBill>('generatedBills', id, data);
  },
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
