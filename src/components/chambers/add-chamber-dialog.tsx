'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chamber } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

interface AddChamberDialogProps {
  onChamberAdded: (chamber: Chamber) => void;
  chamber?: Chamber; // For edit mode
}

export function AddChamberDialog({ onChamberAdded, chamber }: AddChamberDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(chamber?.name || '');
  const [dailyRate, setDailyRate] = useState(chamber?.dailyRentRate?.toString() || '');
  const [capacity, setCapacity] = useState(chamber?.capacity?.toString() || '1000');
  const [occupied, setOccupied] = useState(chamber?.occupied?.toString() || '0');
  const [temperature, setTemperature] = useState(chamber?.temperature || '2-8°C');


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newChamber: Chamber = {
      id: chamber?.id || `chamber_${Date.now()}`,
      name: name || `Chamber ${Math.floor(Math.random() * 100) + 1}`,
      dailyRentRate: parseFloat(dailyRate) || 0,
      capacity: parseInt(capacity) || 1000,
      occupied: parseInt(occupied) || 0,
      contactPerson: chamber?.contactPerson || '',
      contactNumber: chamber?.contactNumber || '',
      address: chamber?.address || '',
      isActive: chamber?.isActive ?? true,
      products: chamber?.products || [],
      temperature: temperature,
      currentTemperature: chamber?.currentTemperature || parseFloat(temperature.split('-')[0]) || 0,
    };

    onChamberAdded(newChamber);
    setOpen(false);
    
    if (!chamber) {
      setName('');
      setDailyRate('');
      setCapacity('1000');
      setOccupied('0');
      setTemperature('2-8°C');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {chamber ? 'Edit Chamber' : 'Add Chamber'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{chamber ? 'Edit Chamber' : 'Add New Chamber'}</DialogTitle>
          <DialogDescription>
            {chamber ? 'Update the details for this chamber.' : 'Fill in the details for the new storage chamber.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Chiller A-2" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dailyRate" className="text-right">Daily Rate (₹)</Label>
                    <Input id="dailyRate" type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} className="col-span-3" placeholder="e.g., 500" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="capacity" className="text-right">Capacity (kg)</Label>
                    <Input id="capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="col-span-3" placeholder="e.g., 1000" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="occupied" className="text-right">Occupied (kg)</Label>
                    <Input id="occupied" type="number" value={occupied} onChange={(e) => setOccupied(e.target.value)} className="col-span-3" placeholder="e.g., 250" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="temperature" className="text-right">Temp. Range</Label>
                    <Input id="temperature" value={temperature} onChange={(e) => setTemperature(e.target.value)} className="col-span-3" placeholder="e.g., 2-8°C or -18°C" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <div className="col-start-2 col-span-3 text-sm text-muted-foreground">
                        Available: {Math.max(0, (parseInt(capacity) || 0) - (parseInt(occupied) || 0))} kg
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">{chamber ? 'Update Chamber' : 'Add Chamber'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
