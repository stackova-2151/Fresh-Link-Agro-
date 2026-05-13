'use client';

import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, Printer } from 'lucide-react';

import { useUser } from '@/context/user-context';
import { chambers, clients, rentalItems as initialRentalItems } from '@/lib/data';
import type { RentalItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { loadOutwardVouchers, saveOutwardVouchers } from '@/lib/voucher-storage';

import { BulkOutwardEntryForm, type OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';

export default function OutwardRegisterPage() {
  const { user } = useUser();
  const [rentalItems, setRentalItems] = useState<RentalItem[]>(initialRentalItems);
  const [vouchers, setVouchers] = useState<OutwardVoucher[]>([]);
  const [activeOutwardNo, setActiveOutwardNo] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setVouchers(loadOutwardVouchers());
  }, []);

  useEffect(() => {
    saveOutwardVouchers(vouchers);
  }, [vouchers]);

  const restoreVoucherStock = (items: RentalItem[], voucher: OutwardVoucher) => {
    const map = new Map<string, RentalItem>(items.map((i) => [i.id, { ...i }]));

    voucher.items.forEach((row) => {
      if (!row.sourceRentalItemId) return;
      const stock = map.get(row.sourceRentalItemId);
      if (!stock) return;

      const bags = typeof row.bags === 'number' ? row.bags : 0;
      const wt = row.totalWeight || 0;

      stock.outwardQuantity = Math.max(0, stock.outwardQuantity - bags);
      stock.quantityAvailable = stock.quantityAvailable + bags;
      stock.outwardWeight = Math.max(0, stock.outwardWeight - wt);
      stock.balanceWeight = stock.balanceWeight + wt;
      map.set(stock.id, stock);
    });

    return Array.from(map.values());
  };

  const applyVoucherStock = (items: RentalItem[], voucher: OutwardVoucher) => {
    const map = new Map<string, RentalItem>(items.map((i) => [i.id, { ...i }]));

    voucher.items.forEach((row) => {
      if (!row.sourceRentalItemId) return;
      const stock = map.get(row.sourceRentalItemId);
      if (!stock) return;

      const bags = typeof row.bags === 'number' ? row.bags : 0;
      const wt = row.totalWeight || 0;

      stock.outwardQuantity = stock.outwardQuantity + bags;
      stock.quantityAvailable = Math.max(0, stock.quantityAvailable - bags);
      stock.outwardWeight = stock.outwardWeight + wt;
      stock.balanceWeight = Math.max(0, stock.balanceWeight - wt);
      map.set(stock.id, stock);
    });

    return Array.from(map.values());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outward Entry"
        description="One voucher for one client/vehicle with multiple outward rows. FEFO inward linking + stock controlled."
      >
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={() => router.push(`/outward/${encodeURIComponent(activeOutwardNo || '')}/print`)}
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
        onUpsert={({ mode, voucher }) => {
          setVouchers((prev) => {
            const idx = prev.findIndex((v) => v.outwardNo.toUpperCase() === voucher.outwardNo.toUpperCase());
            if (idx === -1) return [voucher, ...prev];
            const next = [...prev];
            next[idx] = voucher;
            return next;
          });

          setRentalItems((prev) => {
            if (mode === 'edit') {
              const existing = vouchers.find((v) => v.outwardNo.toUpperCase() === voucher.outwardNo.toUpperCase());
              const restored = existing ? restoreVoucherStock(prev, existing) : prev;
              return applyVoucherStock(restored, voucher);
            }

            return applyVoucherStock(prev, voucher);
          });
        }}
      />
    </div>
  );
}
