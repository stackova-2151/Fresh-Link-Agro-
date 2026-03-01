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
import { OutwardEntry, RentalItem, Client } from '@/lib/types';
import { Calendar as CalendarIcon, PlusCircle, Truck, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { clients, rentalItems } from '@/lib/data';

interface AddOutwardDialogProps {
  onOutwardAdded: (entry: OutwardEntry) => void;
}

export function AddOutwardDialog({ onOutwardAdded }: AddOutwardDialogProps) {
  const [open, setOpen] = useState(false);
  const [outwardNumber, setOutwardNumber] = useState('');
  const [outwardDate, setOutwardDate] = useState<Date | undefined>(new Date());
  const [clientId, setClientId] = useState('');
  const [selectedInwardId, setSelectedInwardId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Filter inward entries for selected client that have balance
  const clientInwardItems = rentalItems.filter(item => item.clientId === clientId && item.quantityAvailable > 0);
  const selectedInwardItem = clientInwardItems.find(item => item.id === selectedInwardId);

  const resetForm = () => {
    setOutwardNumber('');
    setOutwardDate(new Date());
    setClientId('');
    setSelectedInwardId('');
    setQuantity('');
    setWeight('');
    setDriverName('');
    setVehicleNumber('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !selectedInwardItem || !outwardDate) return;

    const newEntry: OutwardEntry = {
      id: `out_${Date.now()}`,
      outwardNumber,
      outwardDate,
      clientId,
      inwardNumber: selectedInwardItem.inwardNumber,
      itemName: selectedInwardItem.name,
      brand: selectedInwardItem.brand,
      quantity: parseInt(quantity) || 0,
      weight: parseFloat(weight) || 0,
      driverName,
      vehicleNumber,
    };

    onOutwardAdded(newEntry);
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Outward
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">New Outward Entry</DialogTitle>
          <DialogDescription>
            Record a stock release. This will reference an existing inward entry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="outwardNumber">Outward No (OutNo)</Label>
                <Input id="outwardNumber" value={outwardNumber} onChange={(e) => setOutwardNumber(e.target.value)} placeholder="e.g., 24709" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outwardDate">Outward Date</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !outwardDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {outwardDate ? format(outwardDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={outwardDate}
                        onSelect={setOutwardDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="client">Customer Name</Label>
                <Select value={clientId} onValueChange={(v) => { setClientId(v); setSelectedInwardId(''); }} required>
                    <SelectTrigger id="client">
                        <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inwardRef">Reference Inward No (InwNo)</Label>
                <Select value={selectedInwardId} onValueChange={setSelectedInwardId} disabled={!clientId} required>
                    <SelectTrigger id="inwardRef">
                        <SelectValue placeholder={clientId ? "Select inward stock" : "Select client first"} />
                    </SelectTrigger>
                    <SelectContent>
                        {clientInwardItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                                {item.inwardNumber} - {item.name} ({item.brand})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              {selectedInwardItem && (
                  <div className="col-span-2 p-3 bg-slate-50 border rounded-md text-sm">
                      <p className="font-bold text-primary">Selected Stock Details:</p>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                          <p><span className="text-muted-foreground">Item:</span> {selectedInwardItem.name}</p>
                          <p><span className="text-muted-foreground">Brand:</span> {selectedInwardItem.brand}</p>
                          <p><span className="text-muted-foreground">Available Qty:</span> {selectedInwardItem.quantityAvailable} {selectedInwardItem.unit}</p>
                          <p><span className="text-muted-foreground">Bal Weight:</span> {selectedInwardItem.balanceWeight} kg</p>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className='space-y-2'>
                    <Label htmlFor="quantity">Out. Qty</Label>
                    <Input 
                        id="quantity" 
                        type="number" 
                        value={quantity} 
                        onChange={(e) => setQuantity(e.target.value)} 
                        max={selectedInwardItem?.quantityAvailable}
                        required 
                    />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor="weight">Out. Weight (kg)</Label>
                    <Input 
                        id="weight" 
                        type="number" 
                        step="0.01" 
                        value={weight} 
                        onChange={(e) => setWeight(e.target.value)} 
                        max={selectedInwardItem?.balanceWeight}
                        required 
                    />
                </div>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="driverName">Driver Name</Label>
                 <div className="relative">
                    <User className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="driverName" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="pl-8" placeholder="e.g., AKSHAY" required />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                 <div className="relative">
                    <Truck className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="vehicleNumber" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="pl-8" placeholder="e.g., MH12 TN5281" required />
                 </div>
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Create Outward Entry</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
