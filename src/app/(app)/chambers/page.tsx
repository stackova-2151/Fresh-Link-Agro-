'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { AddChamberDialog } from "@/components/chambers/add-chamber-dialog";
import { ChamberCard } from "@/components/chambers/chamber-card";
import { chambers as initialChambers } from "@/lib/data";
import type { Chamber } from "@/lib/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ChambersPage() {
    const [chambers, setChambers] = useState<Chamber[]>(initialChambers);
    const [chamberToDelete, setChamberToDelete] = useState<Chamber | null>(null);

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
    
    const handleConfirmDelete = () => {
        if (chamberToDelete) {
            setChambers(prevChambers => prevChambers.filter(c => c.id !== chamberToDelete.id));
            setChamberToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Chambers" description="View and manage your cold storage chambers.">
                <AddChamberDialog onChamberAdded={handleChamberAdded} />
            </PageHeader>
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {chambers.map(chamber => (
                    <ChamberCard 
                        key={chamber.id} 
                        chamber={chamber} 
                        onEdit={() => {}} // The dialog is handled within the card now
                        onDelete={() => setChamberToDelete(chamber)}
                        onChamberUpdated={handleChamberAdded}
                    />
                ))}
            </div>
             <AlertDialog open={!!chamberToDelete} onOpenChange={(open) => !open && setChamberToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        <span className="font-semibold"> {chamberToDelete?.name}</span> chamber.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setChamberToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
