'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";
import { RentalItem, Chamber, Client, Vendor } from "@/lib/types";
import { BulkInwardEntryForm, InwardVoucher } from "@/components/inventory/bulk-inward-entry-form";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { clientsService, chambersService, vendorsService, rentalItemsService } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    getDoc,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { hasEntryApprovalsPermission } from "@/lib/utils";
import { approvalService } from "@/lib/services/approval.service";
import { executeInwardUpdate } from "@/lib/services/inward-update.service";
import type { InwardVoucher as StockReportInwardVoucher } from "@/lib/types/stock-report";

const VOUCHERS_COLLECTION = "inwardVouchers";

function createId(prefix: string) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Convert form InwardVoucher to stock-report InwardVoucher for approval requests
 */
function convertToStockReportVoucher(voucher: InwardVoucher): StockReportInwardVoucher {
    return {
        id: voucher.id,
        inwardNo: voucher.inwardNo,
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
            bags: item.bags,
            unit: item.unit,
            bagWeight: item.bagWeight,
            totalWeight: item.totalWeight,
            rentalItemId: item.rentalItemId,
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

async function loadVouchersFromFirestore(): Promise<InwardVoucher[]> {
    try {
        const snap = await getDocs(collection(db, VOUCHERS_COLLECTION));
        const vouchers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));
        return vouchers.sort((a, b) => b.date.localeCompare(a.date));
    } catch (err) {
        console.error('Failed to load vouchers:', err);
        return [];
    }
}

async function saveVoucherToFirestore(voucher: InwardVoucher, currentVersion?: number): Promise<void> {
    const { id, ...rest } = voucher;
    
    // Calculate next version
    const effectiveCurrentVersion = typeof currentVersion === 'number' ? currentVersion : 0;
    const nextVersion = effectiveCurrentVersion + 1;
    
    await setDoc(doc(db, VOUCHERS_COLLECTION, id), {
        ...rest,
        version: nextVersion,
    });
}

export default function InventoryPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [chambers, setChambers] = useState<Chamber[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
    const [vouchers, setVouchers] = useState<InwardVoucher[]>([]);
    const [activeInwardNo, setActiveInwardNo] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    // Check if user has direct update permission
    const canDirectlyUpdate = hasEntryApprovalsPermission(user);

    useEffect(() => {
        async function fetchAll() {
            try {
                const [c, ch, v, ri, iv] = await Promise.all([
                    clientsService.getAll(),
                    chambersService.getAll(),
                    vendorsService.getAll(),
                    rentalItemsService.getAll(),
                    loadVouchersFromFirestore(),
                ]);
                setClients(c);
                setChambers(ch);
                setVendors(v);
                setRentalItems(ri);
                setVouchers(iv);
            } catch (err) {
                toast({ variant: "destructive", title: "Failed to load data", description: String(err) });
            } finally {
                setLoading(false);
            }
        }
        fetchAll();
    }, []);

    const handleUpsert = async ({
        mode,
        voucher,
        createdItems,
    }: {
        mode: 'new' | 'edit' | 'clientView';
        voucher: InwardVoucher;
        createdItems: RentalItem[];
    }) => {
        try {
            // Check if user has direct update permission
            const canDirectlyUpdate = hasEntryApprovalsPermission(user);

            // For edit mode without approval permission, create approval request
            if (mode === 'edit' && !canDirectlyUpdate) {
                const originalVoucherId = vouchers.find(
                    (v) => v.inwardNo.toUpperCase() === voucher.inwardNo.toUpperCase()
                )?.id;

                if (!originalVoucherId) {
                    toast({ variant: "destructive", title: "Original voucher not found", description: "Cannot create approval request without original voucher data" });
                    return;
                }

                const voucherSnap = await getDoc(doc(db, VOUCHERS_COLLECTION, originalVoucherId));
                if (!voucherSnap.exists()) {
                    toast({ variant: "destructive", title: "Original voucher not found", description: "Cannot create approval request without original voucher data" });
                    return;
                }

                const originalVoucherData = { id: voucherSnap.id, ...voucherSnap.data() } as InwardVoucher;

                const result = await approvalService.createApprovalRequest({
                    entryType: 'INWARD',
                    entryId: originalVoucherData.id,
                    entryNumber: originalVoucherData.inwardNo,
                    originalData: convertToStockReportVoucher(originalVoucherData),
                    requestedData: convertToStockReportVoucher(voucher),
                    requestReason: voucher.updateReason || '',
                    requester: { id: user?.id || '', name: user?.name || 'Unknown', role: user?.role || 'SUB_ADMIN' },
                });

                if (!result.success) {
                    toast({ variant: "destructive", title: "Failed to create approval request", description: result.error || 'Unknown error' });
                    return;
                }

                toast({ title: "Update request submitted successfully", description: "Your request is pending approval." });
                setVouchers((prev) => {
                    const idx = prev.findIndex((v) => v.inwardNo.toUpperCase() === voucher.inwardNo.toUpperCase());
                    if (idx === -1) return prev;
                    const next = [...prev];
                    next[idx] = voucher;
                    return next;
                });
                return;
            }

            const currentVersion = mode === 'edit'
                ? vouchers.find((v) => v.inwardNo.toUpperCase() === voucher.inwardNo.toUpperCase())?.version
                : undefined;
            await saveVoucherToFirestore(voucher, currentVersion);

            if (mode === 'edit') {
                await executeInwardUpdate(voucher, rentalItems, vendors);
                const updatedItems = await rentalItemsService.getAll();
                setRentalItems(updatedItems);
            } else {
                for (const item of createdItems) {
                    await rentalItemsService.createWithId(item);
                }
                setRentalItems((prev) => [...createdItems, ...prev]);
            }

            setVouchers((prev) => {
                const idx = prev.findIndex((v) => v.inwardNo.toUpperCase() === voucher.inwardNo.toUpperCase());
                if (idx === -1) return [voucher, ...prev];
                const next = [...prev];
                next[idx] = voucher;
                return next;
            });
        } catch (err) {
            console.error('Firestore save error:', err);
            toast({ variant: "destructive", title: "Failed to save to Firestore", description: String(err) });
        }
    };

    if (loading) {
        return <div className="p-6 text-muted-foreground">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Inward Entry" description="One voucher for one client/vehicle with multiple inward item rows.">
                <div className="flex gap-2 print:hidden">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/inventory/inward/${encodeURIComponent(activeInwardNo || '')}/print`)}
                        disabled={!activeInwardNo}
                    >
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    {/* <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export CSV</Button> */}
                </div>
            </PageHeader>

            <BulkInwardEntryForm
                clients={clients}
                chambers={chambers}
                vendors={vendors}
                user={user}
                existingItems={rentalItems}
                vouchers={vouchers}
                onVoucherNoChange={setActiveInwardNo}
                onUpsert={handleUpsert}
                canDirectlyUpdate={canDirectlyUpdate}
            />
        </div>
    );
}
