'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { AddChamberDialog } from "@/components/chambers/add-chamber-dialog";
import { ChamberCard } from "@/components/chambers/chamber-card";
import { chambers as initialChambers } from "@/lib/data";
import type { Chamber } from "@/lib/types";

export default function ChambersPage() {
    const [chambers, setChambers] = useState<Chamber[]>(initialChambers);

    const handleChamberAdded = (newChamber: Chamber) => {
        setChambers(prevChambers => {
            const existingIndex = prevChambers.findIndex(c => c.id === newChamber.id);
            if (existingIndex > -1) {
                const updatedChambers = [...prevChambers];
                updatedChambers[existingIndex] = newChamber;
                return updatedChambers;
            }
            return [newChamber, ...prevChambers];
        });
    };
    
    return (
        <div className="space-y-6">
            <PageHeader title="Chambers" description="View and manage your cold storage chambers.">
                <AddChamberDialog onChamberAdded={handleChamberAdded} />
            </PageHeader>
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {chambers.map(chamber => (
                    <ChamberCard key={chamber.id} chamber={chamber} />
                ))}
            </div>
        </div>
    )
}
