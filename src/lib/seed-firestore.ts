'use client';

/**
 * One-time Firestore seeding utility.
 * Seeds static data.ts records into Firestore.
 * Safe to run multiple times — uses setDoc with merge:true so existing docs are not overwritten.
 * Call seedFirestoreData() from a temporary admin page or browser console.
 * DO NOT remove data.ts after seeding — pages still depend on it until Phase 9.
 */
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clients, chambers, vendors } from '@/lib/data';

type SeedResult = {
  collection: string;
  total: number;
  seeded: number;
  skipped: number;
};

async function seedCollection<T extends { id: string }>(
  collectionName: string,
  records: T[],
  extraFields: Record<string, unknown> = {}
): Promise<SeedResult> {
  let seeded = 0;
  let skipped = 0;

  for (const record of records) {
    const ref = doc(db, collectionName, record.id);
    const existing = await getDoc(ref);

    if (existing.exists()) {
      skipped++;
      continue;
    }

    await setDoc(ref, {
      ...record,
      ...extraFields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    seeded++;
  }

  return { collection: collectionName, total: records.length, seeded, skipped };
}

export async function seedFirestoreData(): Promise<SeedResult[]> {
  const results: SeedResult[] = [];

  // Seed clients
  const clientResult = await seedCollection('clients', clients);
  results.push(clientResult);

  // Seed chambers (strip products array — not needed in Firestore)
  const chamberRecords = chambers.map(({ products: _products, ...rest }) => rest);
  const chamberResult = await seedCollection('chambers', chamberRecords);
  results.push(chamberResult);

  // Seed vendors
  const vendorResult = await seedCollection('vendors', vendors);
  results.push(vendorResult);

  return results;
}
