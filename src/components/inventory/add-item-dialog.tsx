
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
import { Calendar as CalendarIcon, PlusCircle } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { vendors, clients, chambers } from '@/lib/data'; // Assuming vendors are available in data

interface AddItemDialogProps {
  onItemAdded: (item: RentalItem) => void;
  item?: RentalItem; // For edit mode
  trigger?: React.ReactNode;
}

export function AddItemDialog({ onItemAdded, item, trigger }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [rentalRate, setRentalRate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<RentalItem['unit']>('kg');
  const [condition, setCondition] = useState<RentalItem['condition']>('New');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [tempRange, setTempRange] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [clientId, setClientId] = useState('');
  const [chamberId, setChamberId] = useState('');
  const [boxLength, setBoxLength] = useState('');
  const [boxWidth, setBoxWidth] = useState('');
  const [boxHeight, setBoxHeight] = useState('');


  useEffect(() => {
    if (item && open) {
        setName(item.name);
        setCategory(item.category);
        setDescription(item.description);
        setRentalRate(item.rentalRate.toString());
        setQuantity(item.quantityAvailable.toString());
        setUnit(item.unit);
        setCondition(item.condition);
        setExpiryDate(item.expiryDate ? new Date(item.expiryDate) : undefined);
        setTempRange(item.temperatureRange);
        setVendorId(item.vendorId);
        setClientId(item.clientId);
        setChamberId(item.chamberId || '');
        setBoxLength(item.boxDimensions?.length.toString() || '');
        setBoxWidth(item.boxDimensions?.width.toString() || '');
        setBoxHeight(item.boxDimensions?.height.toString() || '');
    }
  }, [item, open]);

  const resetForm = () => {
    setName('');
    setCategory('Food');
    setDescription('');
    setRentalRate('');
    setQuantity('');
    setUnit('kg');
    setCondition('New');
    setExpiryDate(undefined);
    setTempRange('');
    setVendorId('');
    setClientId('');
    setChamberId('');
    setBoxLength('');
    setBoxWidth('');
    setBoxHeight('');
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !item) {
        resetForm();
    }
    setOpen(isOpen);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiryDate || !vendorId || !clientId) {
        // Ideally show a toast or error message
        console.error("Expiry date, vendor, and client are required");
        return;
    }

    const newItem: RentalItem = {
      id: item?.id || `item_${Date.now()}`,
      name,
      category,
      description,
      rentalRate: parseFloat(rentalRate) || 0,
      quantityAvailable: parseInt(quantity) || 0,
      unit,
      condition,
      expiryDate,
      temperatureRange: tempRange,
      images: [],
      rentalCycles: ['daily', 'weekly'], // Default value
      vendorId,
      clientId,
      chamberId,
      boxDimensions: {
        length: parseFloat(boxLength) || 0,
        width: parseFloat(boxWidth) || 0,
        height: parseFloat(boxHeight) || 0,
      }
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
        Add Item
      </Button>
    </DialogTrigger>
  );

  const selectedChamber = chambers.find(c => c.id === chamberId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {dialogTrigger}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline">{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the details for this item.' : 'Fill in the details for the new rental item.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Gourmet Cheese Platter" required />
              </div>
               <div className="space-y-2">
                 <Label htmlFor="client">Client</Label>
                <Select value={clientId} onValueChange={setClientId} required>
                    <SelectTrigger id="client">
                        <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map((client: Client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                 <Label htmlFor="vendor">Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId} required>
                    <SelectTrigger id="vendor">
                        <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                        {vendors.map((vendor: Vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentalRate">Rental Rate (₹)</Label>
                <Input id="rentalRate" type="number" value={rentalRate} onChange={(e) => setRentalRate(e.target.value)} placeholder="e.g., 1200" required/>
              </div>
               <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of the item." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className='space-y-2'>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 15" required />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={unit} onValueChange={(value) => setUnit(value as RentalItem['unit'])}>
                        <SelectTrigger id="unit">
                            <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="units">units</SelectItem>
                            <SelectItem value="liters">liters</SelectItem>
                            <SelectItem value="weights">weights</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select value={condition} onValueChange={(value) => setCondition(value as RentalItem['condition'])}>
                    <SelectTrigger id="condition">
                        <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Used">Used</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiryDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={expiryDate}
                        onSelect={setExpiryDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempRange">Temperature Range</Label>
                <Input id="tempRange" value={tempRange} onChange={(e) => setTempRange(e.target.value)} placeholder="e.g., 2-8°C" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Box Dimensions (cm)</Label>
                <div className="grid grid-cols-3 gap-2">
                    <Input id="boxLength" value={boxLength} onChange={e => setBoxLength(e.target.value)} placeholder="Length" type="number" />
                    <Input id="boxWidth" value={boxWidth} onChange={e => setBoxWidth(e.target.value)} placeholder="Width" type="number" />
                    <Input id="boxHeight" value={boxHeight} onChange={e => setBoxHeight(e.target.value)} placeholder="Height" type="number" />
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                 <Label htmlFor="chamber">Chamber</Label>
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
                {selectedChamber && (
                    <div className="text-sm text-muted-foreground pt-1">
                        Capacity: {selectedChamber.occupied} / {selectedChamber.capacity} kg used. 
                        ({selectedChamber.capacity - selectedChamber.occupied} kg available)
                    </div>
                )}
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{item ? 'Update Item' : 'Add Item'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
