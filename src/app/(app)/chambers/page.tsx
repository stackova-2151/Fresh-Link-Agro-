'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { AddChamberDialog } from '@/components/chambers/add-chamber-dialog';
import { ChamberCard } from '@/components/chambers/chamber-card';
import type { Chamber } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { chambersService } from '@/lib/firestore';

export default function ChambersPage() {
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [chamberToDelete, setChamberToDelete] = useState<Chamber | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    try {
      const data = await chambersService.getAll();
      setChambers(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load chambers.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChamberAdded = async (newChamber: Chamber) => {
    try {
      const existing = chambers.find((c) => c.id === newChamber.id);
      if (existing) {
        await chambersService.update(newChamber.id, newChamber);
      } else {
        await chambersService.createWithId(newChamber);
      }
      await load();
      toast({ title: existing ? 'Chamber updated' : 'Chamber added', description: newChamber.name });
    } catch {
      toast({ title: 'Error', description: 'Failed to save chamber.', variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!chamberToDelete) return;
    try {
      await chambersService.delete(chamberToDelete.id);
      await load();
      toast({ title: 'Chamber deleted', description: chamberToDelete.name });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete chamber.', variant: 'destructive' });
    } finally {
      setChamberToDelete(null);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading chambers...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Chambers" description="View and manage your cold storage chambers.">
        <AddChamberDialog onChamberAdded={handleChamberAdded} />
      </PageHeader>
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {chambers.map((chamber) => (
          <ChamberCard
            key={chamber.id}
            chamber={chamber}
            onEdit={() => {}}
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
              This will permanently delete <span className="font-semibold">{chamberToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChamberToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
