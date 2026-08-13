'use client';

import { useState, useEffect } from 'react';
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
import { RoomConfig } from './room-config';
import type { Room } from '@/lib/types/room-block';

interface AddChamberDialogProps {
  onChamberAdded: (chamber: Chamber) => void;
  chamber?: Chamber; // For edit mode
  trigger?: React.ReactNode;
}

export function AddChamberDialog({ onChamberAdded, chamber, trigger }: AddChamberDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [temperature, setTemperature] = useState('2-8°C');
  const [boxLength, setBoxLength] = useState('');
  const [boxWidth, setBoxWidth] = useState('');
  const [boxHeight, setBoxHeight] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (chamber && open) {
        setName(chamber.name);
        setDailyRate(chamber.dailyRentRate?.toString() || '');
        setTemperature(chamber.temperature);
        setBoxLength(chamber.boxDimensions?.length.toString() || '');
        setBoxWidth(chamber.boxDimensions?.width.toString() || '');
        setBoxHeight(chamber.boxDimensions?.height.toString() || '');
        setRooms(chamber.rooms || []);
    }
  }, [chamber, open]);

  const resetForm = () => {
    setName('');
    setDailyRate('');
    setTemperature('2-8°C');
    setBoxLength('');
    setBoxWidth('');
    setBoxHeight('');
    setRooms([]);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !chamber) {
        resetForm();
    }
    setOpen(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newChamber: Chamber = {
      id: chamber?.id || `chamber_${Date.now()}`,
      name: name || `Chamber ${Math.floor(Math.random() * 100) + 1}`,
      dailyRentRate: parseFloat(dailyRate) || 0,
      contactPerson: chamber?.contactPerson || '',
      contactNumber: chamber?.contactNumber || '',
      address: chamber?.address || '',
      isActive: chamber?.isActive ?? true,
      products: chamber?.products || [],
      temperature: temperature,
      boxDimensions: {
        length: parseFloat(boxLength) || 0,
        width: parseFloat(boxWidth) || 0,
        height: parseFloat(boxHeight) || 0,
      },
      rooms: rooms.length > 0 ? rooms : undefined,
    };

    onChamberAdded(newChamber);
    setOpen(false);
  };
  
  const dialogTrigger = trigger ? (
    <DialogTrigger asChild onClick={() => setOpen(true)}>{trigger}</DialogTrigger>
  ) : (
    <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Chamber
        </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {dialogTrigger}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{chamber ? 'Edit Chamber' : 'Add New Chamber'}</DialogTitle>
          <DialogDescription>
            {chamber ? 'Update the details for this chamber.' : 'Fill in the details for the new storage chamber.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Chiller A-2" required />
                </div>
                {/* <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dailyRate" className="text-right">Daily Rate (₹)</Label>
                    <Input id="dailyRate" type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} className="col-span-3" placeholder="e.g., 500" />
                </div> */}
                 {/* <div className="col-span-2 space-y-2">
                    <Label>Dimensions (cm)</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <Input id="boxLength" value={boxLength} onChange={e => setBoxLength(e.target.value)} placeholder="Length" type="number" />
                        <Input id="boxWidth" value={boxWidth} onChange={e => setBoxWidth(e.target.value)} placeholder="Width" type="number" />
                        <Input id="boxHeight" value={boxHeight} onChange={e => setBoxHeight(e.target.value)} placeholder="Height" type="number" />
                    </div>
                </div> */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="temperature" className="text-right">Temp. Range</Label>
                    <Input id="temperature" value={temperature} onChange={(e) => setTemperature(e.target.value)} className="col-span-3" placeholder="e.g., 2-8°C or -18°C" />
                </div>
                <div className="col-span-4 pt-4 border-t">
                    <RoomConfig rooms={rooms} onRoomsChange={setRooms} />
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
