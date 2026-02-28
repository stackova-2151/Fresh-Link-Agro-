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
import { RentalItem, Vendor, Client, Chamber } from '@/lib/types';
import { Calendar as CalendarIcon, PlusCircle, Truck, User } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { vendors, clients, chambers } from '@/lib/data';

interface AddItemDialogProps {
  onItemAdded: (item: RentalItem) => void;
  item?: RentalItem;
  trigger?: React.ReactNode;
}

export function AddItemDialog({ onItemAdded, item, trigger }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [inwardNumber, setInwardNumber] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [category, setCategory] = useState('Dairy');
  const [description, setDescription] = useState('');
  const [rentalRate, setRentalRate] = useState('');
  const [inwardQuantity, setInwardQuantity] = useState('');
  const [outwardQuantity, setOutwardQuantity] =('0');
  const [unit, setUnit] = useState<RentalItem['unit']>('boxes');
  const [inwardWeight, setInwardWeight] = useState('');
  const [outwardWeight, setOutwardWeight] = useState('0');
  const [storageDate, setStorageDate] = useState<Date | undefined>();
  const [vendorId, setVendorId] = useState('');
  const [clientId, setClientId] = useState('');
  const [chamberId, setChamberId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  useEffect(() => {
    if (item && open) {
        setInwardNumber(item.inwardNumber);
        setName(item.name);
        setBrand(item.brand);
        setBatchNumber(item.batchNumber);
        setCategory(item.category);
        setDescription(item.description);
        setRentalRate(item.rentalRate.toString());
        setInwardQuantity(item.inwardQuantity.toString());
        setOutwardQuantity(item.outwardQuantity.toString());
        setUnit(item.unit);
        setInwardWeight(item.inwardWeight.toString());
        setOutwardWeight(item.outwardWeight.toString());
        setStorageDate(item.storageDate ? new Date(item.storageDate) : undefined);
        setVendorId(item.vendorId);
        setClientId(item.clientId);
        setChamberId(item.chamberId || '');
        setDriverName(item.driverName || '');
        setVehicleNumber(item.vehicleNumber || '');
    } else if (!item && open) {
        setStorageDate(new Date());
    }
  }, [item, open]);

  const resetForm = () => {
    setInwardNumber('');
    setName('');
    setBrand('');
    setBatchNumber('');
    setCategory('Dairy');
    setDescription('');
    setRentalRate('');
    setInwardQuantity('');
    setOutwardQuantity('0');
    setUnit('boxes');
    setInwardWeight('');
    setOutwardWeight('0');
    setStorageDate(new Date());
    setVendorId('');
    setClientId('');
    setChamberId('');
    setDriverName('');
    setVehicleNumber('');
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !item) {
        resetForm();
    }
    setOpen(isOpen);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !clientId || !storageDate) return;

    const inQty = parseInt(inwardQuantity) || 0;
    const outQty = parseInt(outwardQuantity) || 0;
    const inWt = parseFloat(inwardWeight) || 0;
    const outWt = parseFloat(outwardWeight) || 0;

    const newItem: RentalItem = {
      id: item?.id || `item_${Date.now()}`,
      inwardNumber,
      name,
      brand,
      batchNumber,
      category,
      description,
      rentalRate: parseFloat(rentalRate) || 0,
      inwardQuantity: inQty,
      outwardQuantity: outQty,
      quantityAvailable: inQty - outQty,
      unit,
      inwardWeight: inWt,
      outwardWeight: outWt,
      balanceWeight: inWt - outWt,
      condition: 'New',
      expiryDate: new Date(new Date().getFullYear() + 1, 11, 31),
      storageDate,
      temperatureRange: 'Frozen',
      images: [],
      rentalCycles: ['monthly'],
      vendorId,
      clientId,
      chamberId,
      driverName,
      vehicleNumber,
    };

    onItemAdded(newItem);
    setOpen(false);
  };

  const dialogTrigger = trigger ? (
    <DialogTrigger asChild>{trigger}</DialogTrigger>
  ) : (
    <DialogTrigger asChild>
      <Button>
        <PlusCircle className="mr-2 h-4 w-4" />
        New Entry
      </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {dialogTrigger}
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{item ? 'Edit Stock Entry' : 'New Stock Inward'}</DialogTitle>
          <DialogDescription>
            Enter details from the inward register for professional cold storage tracking.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inwardNumber">Inward No (Inw.No)</Label>
                <Input id="inwardNumber" value={inwardNumber} onChange={(e) => setInwardNumber(e.target.value)} placeholder="e.g., 08213" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageDate">Inward Date</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !storageDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {storageDate ? format(storageDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={storageDate}
                        onSelect={setStorageDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                 <Label htmlFor="client">Customer Name</Label>
                <Select value={clientId} onValueChange={setClientId} required>
                    <SelectTrigger id="client">
                        <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map((client: Client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Item Description</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., WHIIP CREAM" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., DECOR" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch #</Label>
                <Input id="batchNumber" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g., JKT110" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className='space-y-2'>
                    <Label htmlFor="inwardQuantity">Inw. Qty</Label>
                    <Input id="inwardQuantity" type="number" value={inwardQuantity} onChange={(e) => setInwardQuantity(e.target.value)} required />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={unit} onValueChange={(v: any) => setUnit(v)}>
                        <SelectTrigger id="unit">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="boxes">Boxes</SelectItem>
                            <SelectItem value="bags">Bags</SelectItem>
                            <SelectItem value="kg">KG</SelectItem>
                            <SelectItem value="units">Units</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className='space-y-2'>
                    <Label htmlFor="inwardWeight">Inw. Weight (kg)</Label>
                    <Input id="inwardWeight" type="number" step="0.01" value={inwardWeight} onChange={(e) => setInwardWeight(e.target.value)} required />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor="rentalRate">Daily Rate (₹)</Label>
                    <Input id="rentalRate" type="number" step="0.01" value={rentalRate} onChange={(e) => setRentalRate(e.target.value)} placeholder="e.g., 1.50" required/>
                </div>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="driverName">Driver Name</Label>
                 <div className="relative">
                    <User className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="driverName" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="pl-8" placeholder="e.g., BIRAPPA" />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                 <div className="relative">
                    <Truck className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="vehicleNumber" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="pl-8" placeholder="e.g., MH12 DT2119" />
                 </div>
              </div>

              <div className="space-y-2 col-span-2">
                 <Label htmlFor="chamber">Storage Chamber</Label>
                <Select value={chamberId} onValueChange={setChamberId}>
                    <SelectTrigger id="chamber">
                        <SelectValue placeholder="Select a chamber" />
                    </SelectTrigger>
                    <SelectContent>
                        {chambers.map((chamber: Chamber) => (
                            <SelectItem key={chamber.id} value={chamber.id}>{chamber.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{item ? 'Update Entry' : 'Create Register Entry'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
