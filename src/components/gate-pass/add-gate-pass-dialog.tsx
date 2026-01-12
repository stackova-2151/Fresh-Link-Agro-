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
import { GatePass } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AddGatePassDialogProps {
  onGatePassAdded: (gatePass: GatePass) => void;
}

export function AddGatePassDialog({ onGatePassAdded }: AddGatePassDialogProps) {
  const [open, setOpen] = useState(false);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const newGatePass: GatePass = {
      id: `gp_${Date.now()}`,
      gatePassNumber: `GP-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 900) + 100}`,
      type: data.type as 'IN' | 'OUT',
      entryTime: new Date(),
      vehicleNumber: data.vehicleNumber as string,
      driverName: data.driverName as string,
      driverPhone: data.driverPhone as string,
      customerName: data.customerName as string,
      items: [{ name: data.items as string, quantity: parseFloat(data.quantity as string), unit: data.unit as string }],
      inboundTemperature: parseFloat(data.temperature as string),
      status: 'On-Premises',
      notes: data.notes as string,
      dockNumber: data.dockNumber ? parseInt(data.dockNumber as string) as GatePass['dockNumber'] : undefined
    };

    onGatePassAdded(newGatePass);
    setOpen(false);
    e.currentTarget.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Gate Pass
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">New Gate Pass</DialogTitle>
          <DialogDescription>
            Register a new vehicle entry or exit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <RadioGroup defaultValue="IN" id="type" name="type" className="flex">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="IN" id="r-in" />
                        <Label htmlFor="r-in">IN</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="OUT" id="r-out" />
                        <Label htmlFor="r-out">OUT</Label>
                    </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer/Vendor Name</Label>
                <Input id="customerName" name="customerName" placeholder="e.g., Prestige Catering" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input id="vehicleNumber" name="vehicleNumber" placeholder="e.g., MH12 AB1234" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input id="driverName" name="driverName" placeholder="e.g., Ramesh Patel" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverPhone">Driver Phone</Label>
                <Input id="driverPhone" name="driverPhone" type="tel" placeholder="e.g., 9876543210" required />
              </div>
               <div className="space-y-2">
                <Label htmlFor="temperature">Vehicle Temperature (°C)</Label>
                <Input id="temperature" name="temperature" type="number" step="0.1" placeholder="e.g., 4.5" required />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="dockNumber">Dock Number</Label>
                  <Select name="dockNumber">
                      <SelectTrigger>
                          <SelectValue placeholder="Select a dock" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="1">Dock 1</SelectItem>
                          <SelectItem value="2">Dock 2</SelectItem>
                          <SelectItem value="3">Dock 3</SelectItem>
                          <SelectItem value="4">Dock 4</SelectItem>
                          <SelectItem value="5">Dock 5</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
               <div className="space-y-2 col-span-1 md:col-span-2">
                <Label>Items</Label>
                <div className='grid grid-cols-3 gap-2'>
                    <Input name="items" placeholder="Item Name" required />
                    <Input name="quantity" type="number" placeholder="Quantity" required />
                    <Input name="unit" placeholder="Unit (e.g., kg)" required />
                </div>
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Generate Pass</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
