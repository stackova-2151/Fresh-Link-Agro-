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
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const VOUCHERS_COLLECTION = "inwardVouchers";

function createId(prefix: string) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
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

async function saveVoucherToFirestore(voucher: InwardVoucher): Promise<void> {
    const { id, ...rest } = voucher;
    await setDoc(doc(db, VOUCHERS_COLLECTION, id), rest);
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
            console.log('Saving voucher to Firestore:', voucher.inwardNo);

            await saveVoucherToFirestore(voucher);
            console.log('Voucher saved successfully');

            if (mode === 'edit') {
                const inwardNoUpper = voucher.inwardNo.toUpperCase();
                const existingRentalItems = rentalItems.filter(
                    (i) => i.inwardNumber.toUpperCase() === inwardNoUpper
                );

                const findMatchingRentalItem = (row: typeof voucher.items[0]) => {
                    return existingRentalItems.find(
                        (item) =>
                            item.name.trim().toLowerCase() === row.itemName.trim().toLowerCase() &&
                            item.brand.trim().toLowerCase() === row.brand.trim().toLowerCase() &&
                            item.batchNumber.trim() === row.batch.trim() &&
                            item.chamberId === row.chamberId
                    );
                };

                const usedRentalItemIds = new Set<string>();

                for (const row of voucher.items) {
                    const matchingItem = findMatchingRentalItem(row);

                    if (matchingItem) {
                        const qty = typeof row.bags === 'number' ? row.bags : 0;
                        const wt = row.totalWeight;
                        const exp = row.expDate ? new Date(row.expDate) : new Date(voucher.date);
                        const storage = new Date(voucher.date);

                        await rentalItemsService.update(matchingItem.id, {
                            name: row.itemName.trim(),
                            brand: row.brand.trim(),
                            batchNumber: row.batch.trim(),
                            chamberId: row.chamberId,
                            inwardQuantity: qty,
                            quantityAvailable: qty,
                            inwardWeight: wt,
                            balanceWeight: wt,
                            expiryDate: exp,
                            storageDate: storage,
                            clientId: voucher.clientId,
                            driverName: voucher.driverName,
                            vehicleNumber: voucher.vehicleNo,
                        });

                        usedRentalItemIds.add(matchingItem.id);
                    } else {
                        const qty = typeof row.bags === 'number' ? row.bags : 0;
                        const wt = row.totalWeight;
                        const exp = row.expDate ? new Date(row.expDate) : new Date(voucher.date);
                        const storage = new Date(voucher.date);
                        const vendorId = vendors[0]?.id ?? 'vendor_01';

                        const newItem: RentalItem = {
                            id: createId('rental_item'),
                            inwardNumber: voucher.inwardNo,
                            name: row.itemName.trim(),
                            brand: row.brand.trim(),
                            batchNumber: row.batch.trim(),
                            category: 'General',
                            description: '',
                            rentalRate: 0,
                            rentalCycles: ['daily'],
                            inwardQuantity: qty,
                            outwardQuantity: 0,
                            quantityAvailable: qty,
                            unit: 'kg',
                            inwardWeight: wt,
                            outwardWeight: 0,
                            balanceWeight: wt,
                            expiryDate: exp,
                            storageDate: storage,
                            temperatureRange: '',
                            vendorId,
                            clientId: voucher.clientId,
                            chamberId: row.chamberId,
                            block: '',
                            zone: '',
                            driverName: voucher.driverName,
                            vehicleNumber: voucher.vehicleNo,
                            images: [],
                            condition: 'Good',
                        };

                        await rentalItemsService.createWithId(newItem);
                        usedRentalItemIds.add(newItem.id);
                    }
                }

                for (const existingItem of existingRentalItems) {
                    if (!usedRentalItemIds.has(existingItem.id)) {
                        await rentalItemsService.delete(existingItem.id);
                    }
                }

                const updatedItems = await rentalItemsService.getAll();
                setRentalItems(updatedItems);
            } else {
                console.log('Saving rental items:', createdItems.length);
                for (const item of createdItems) {
                    await rentalItemsService.createWithId(item);
                }
                console.log('All items saved successfully');
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
            />
        </div>
    );
}
