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
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clientsService, chambersService, rentalItemsService } from '@/lib/firestore';

import type { RentalItem, Chamber, Client, Vendor } from '@/lib/types';
import {
  BulkOutwardEntryForm,
  type OutwardVoucher,
  type OutwardConsoleMode,
} from '@/components/outward/bulk-outward-entry-form';
import { hasEntryApprovalsPermission } from '@/lib/utils';
import { approvalService } from '@/lib/services/approval.service';
import { executeOutwardUpdate } from '@/lib/services/outward-update.service';
import type { OutwardVoucher as StockReportOutwardVoucher } from '@/lib/types/stock-report';

const OUTWARD_COLLECTION = 'outwardVouchers';

/**
 * Convert form OutwardVoucher to stock-report OutwardVoucher for approval requests
 */
function convertToStockReportVoucher(voucher: OutwardVoucher): StockReportOutwardVoucher {
  return {
    id: voucher.id,
    outwardNo: voucher.outwardNo,
    clientId: voucher.clientId,
    clientName: voucher.clientName,
    date: voucher.date,
    items: voucher.items.map(item => ({
      id: item.id,
      itemName: item.itemName,
      brand: item.brand,
      batch: item.batch,
      chamberId: item.chamberId,
      roomId: item.roomId,
      blockId: item.blockId,
      qty: item.qty,
      bags: item.bags,
      bagWeight: item.bagWeight,
      totalWeight: item.totalWeight,
      inwardNumber: item.inwardNumber,
      expDate: item.expDate,
      sourceRentalItemId: item.sourceRentalItemId,
    })),
    createdById: voucher.createdById,
    createdByName: voucher.createdByName,
    createdAt: voucher.createdAt,
    updatedById: voucher.updatedById,
    updatedByName: voucher.updatedByName,
    updatedAt: voucher.updatedAt,
    updateReason: voucher.updateReason,
  };
}

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

  // Check if user has direct update permission
  const canDirectlyUpdate = hasEntryApprovalsPermission(user);

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
      // Check if user has direct update permission
      // For edit mode without approval permission, create approval request
      if (mode === 'edit' && !canDirectlyUpdate) {
        console.log('User does not have direct update permission, creating approval request');

        // Get original voucher ID from local state
        const originalVoucherId = vouchers.find(
          (v) => v.outwardNo.toUpperCase() === voucher.outwardNo.toUpperCase()
        )?.id;

        if (!originalVoucherId) {
          toast({
            variant: "destructive",
            title: "Original voucher not found",
            description: "Cannot create approval request without original voucher data",
          });
          return;
        }

        // Fetch original voucher from Firestore (source of truth)
        const voucherSnap = await getDoc(doc(db, OUTWARD_COLLECTION, originalVoucherId));
        if (!voucherSnap.exists()) {
          toast({
            variant: "destructive",
            title: "Original voucher not found",
            description: "Cannot create approval request without original voucher data",
          });
          return;
        }

        const originalVoucherData = {
          id: voucherSnap.id,
          ...voucherSnap.data(),
        } as OutwardVoucher;

        // Create approval request
        const result = await approvalService.createApprovalRequest({
          entryType: 'OUTWARD',
          entryId: originalVoucherData.id,
          entryNumber: originalVoucherData.outwardNo,
          originalData: convertToStockReportVoucher(originalVoucherData),
          requestedData: convertToStockReportVoucher(voucher),
          requestReason: voucher.updateReason || '',
          requester: {
            id: user?.id || '',
            name: user?.name || 'Unknown',
            role: user?.role || 'SUB_ADMIN',
          },
        });

        if (!result.success) {
          toast({
            variant: "destructive",
            title: "Failed to create approval request",
            description: result.error || 'Unknown error',
          });
          return;
        }

        // Success - show approval request message
        toast({
          title: "Update request submitted successfully",
          description: "Your request is pending approval.",
        });

        // Update vouchers state to reflect the requested changes (for display only)
        setVouchers((prev) => {
          const idx = prev.findIndex((v) => v.outwardNo.toUpperCase() === voucher.outwardNo.toUpperCase());
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = voucher;
          return next;
        });

        return;
      }

      // Direct update path (NEW mode or EDIT mode with approval permission)
      // Find existing voucher for reverse stock deduction (edit mode only)
      const existing = mode === 'edit' ? vouchers.find(
        (v) => v.outwardNo.toUpperCase() === voucher.outwardNo.toUpperCase()
      ) : undefined;

      // Get current version for version increment
      const currentVersion = mode === 'edit' 
        ? vouchers.find((v) => v.outwardNo.toUpperCase() === voucher.outwardNo.toUpperCase())?.version
        : undefined;

      // Use reusable service for outward update
      await executeOutwardUpdate(voucher, existing, currentVersion, false, undefined);

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
      // Rethrow error so the form knows the operation failed
      throw err;
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
        canDirectlyUpdate={canDirectlyUpdate}
      />
    </div>
  );
}
