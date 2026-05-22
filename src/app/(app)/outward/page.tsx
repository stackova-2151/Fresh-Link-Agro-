'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, Printer } from 'lucide-react';

import { useUser } from '@/context/user-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clientsService, chambersService, rentalItemsService } from '@/lib/firestore';

import type { RentalItem, Chamber, Client, Vendor } from '@/lib/types';
import {
  BulkOutwardEntryForm,
  type OutwardVoucher,
  type OutwardConsoleMode,
} from '@/components/outward/bulk-outward-entry-form';

const OUTWARD_COLLECTION = 'outwardVouchers';

// ── Firestore helpers ─────────────────────────────────────────────────────────

async function loadOutwardVouchersFromFirestore(): Promise<OutwardVoucher[]> {
  try {
    const snap = await getDocs(
      query(collection(db, OUTWARD_COLLECTION), orderBy('date', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
  } catch (err) {
    console.error('Failed to load outward vouchers:', err);
    return [];
  }
}

async function saveOutwardVoucherToFirestore(voucher: OutwardVoucher): Promise<void> {
  const { id, ...rest } = voucher;
  await setDoc(doc(db, OUTWARD_COLLECTION, id), rest);
}

/**
 * Atomically deducts stock from rentalItems using Firestore increment().
 * This is safe for concurrent writes.
 */
async function applyStockDeduction(
  items: OutwardVoucher['items']
): Promise<void> {
  for (const row of items) {
    if (!row.sourceRentalItemId) continue;
    const bags = typeof row.bags === 'number' ? row.bags : 0;
    const wt = row.totalWeight || 0;
    if (bags <= 0) continue;

    await updateDoc(doc(db, 'rentalItems', row.sourceRentalItemId), {
      outwardQuantity: increment(bags),
      quantityAvailable: increment(-bags),
      outwardWeight: increment(wt),
      balanceWeight: increment(-wt),
    });
  }
}

/**
 * Reverses a previous stock deduction (for edit mode).
 */
async function reverseStockDeduction(
  items: OutwardVoucher['items']
): Promise<void> {
  for (const row of items) {
    if (!row.sourceRentalItemId) continue;
    const bags = typeof row.bags === 'number' ? row.bags : 0;
    const wt = row.totalWeight || 0;
    if (bags <= 0) continue;

    await updateDoc(doc(db, 'rentalItems', row.sourceRentalItemId), {
      outwardQuantity: increment(-bags),
      quantityAvailable: increment(bags),
      outwardWeight: increment(-wt),
      balanceWeight: increment(wt),
    });
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OutwardRegisterPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [vouchers, setVouchers] = useState<OutwardVoucher[]>([]);
  const [activeOutwardNo, setActiveOutwardNo] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [c, ch, ri, ov] = await Promise.all([
          clientsService.getAll(),
          chambersService.getAll(),
          rentalItemsService.getAll(),
          loadOutwardVouchersFromFirestore(),
        ]);
        setClients(c);
        setChambers(ch);
        setRentalItems(ri);
        setVouchers(ov);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Failed to load data', description: String(err) });
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const handleUpsert = async ({
    mode,
    voucher,
  }: {
    mode: OutwardConsoleMode;
    voucher: OutwardVoucher;
  }) => {
    try {
      if (mode === 'edit') {
        // Reverse previous stock deduction before applying new one
        const existing = vouchers.find(
          (v) => v.outwardNo.toUpperCase() === voucher.outwardNo.toUpperCase()
        );
        if (existing) {
          await reverseStockDeduction(existing.items);
        }
      }

      // Save voucher to Firestore
      await saveOutwardVoucherToFirestore(voucher);

      // Apply stock deduction atomically
      await applyStockDeduction(voucher.items);

      // Refresh rental items from Firestore to get updated stock
      const updatedItems = await rentalItemsService.getAll();
      setRentalItems(updatedItems);

      // Update local vouchers state
      setVouchers((prev) => {
        const idx = prev.findIndex(
          (v) => v.outwardNo.toUpperCase() === voucher.outwardNo.toUpperCase()
        );
        if (idx === -1) return [voucher, ...prev];
        const next = [...prev];
        next[idx] = voucher;
        return next;
      });

      toast({ title: 'Success', description: 'Outward entry saved to Firestore.' });
    } catch (err) {
      console.error('Outward save error:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to save outward entry',
        description: String(err),
      });
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outward Entry"
        description="One voucher for one client/vehicle with multiple outward rows. FEFO inward linking + stock controlled."
      >
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/outward/${encodeURIComponent(activeOutwardNo || '')}/print`)
            }
            disabled={!activeOutwardNo}
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          {(user?.role === 'ADMIN' || user?.role === 'MASTER_ADMIN') && (
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" /> Export
            </Button>
          )}
        </div>
      </PageHeader>

      <BulkOutwardEntryForm
        clients={clients}
        chambers={chambers}
        user={user}
        existingItems={rentalItems}
        vouchers={vouchers}
        onVoucherNoChange={setActiveOutwardNo}
        onUpsert={handleUpsert}
      />
    </div>
  );
}
