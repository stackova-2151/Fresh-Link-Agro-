'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { rentalItems as initialRentalItems, clients, chambers, vendors } from "@/lib/data";
import { FileDown, Printer } from "lucide-react";
import { RentalItem } from "@/lib/types";
import { BulkInwardEntryForm, InwardVoucher } from "@/components/inventory/bulk-inward-entry-form";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { loadInwardVouchers, saveInwardVouchers } from "@/lib/voucher-storage";

export default function InventoryPage() {
    const [rentalItems, setRentalItems] = useState<RentalItem[]>(initialRentalItems);
    const [vouchers, setVouchers] = useState<InwardVoucher[]>([]);
    const [activeInwardNo, setActiveInwardNo] = useState<string>('');
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
        setVouchers(loadInwardVouchers());
    }, []);

    useEffect(() => {
        saveInwardVouchers(vouchers);
    }, [vouchers]);

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
                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export CSV</Button>
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
                onUpsert={({ mode, voucher, createdItems }) => {
                    setVouchers((prev) => {
                        const idx = prev.findIndex((v) => v.inwardNo.toUpperCase() === voucher.inwardNo.toUpperCase());
                        if (idx === -1) return [voucher, ...prev];
                        const next = [...prev];
                        next[idx] = voucher;
                        return next;
                    });

                    setRentalItems((prev) => {
                        if (mode === 'edit') {
                            const remaining = prev.filter((i) => i.inwardNumber.toUpperCase() !== voucher.inwardNo.toUpperCase());
                            return [...createdItems, ...remaining];
                        }
                        return [...createdItems, ...prev];
                    });
                }}
            />
        </div>
    );
}