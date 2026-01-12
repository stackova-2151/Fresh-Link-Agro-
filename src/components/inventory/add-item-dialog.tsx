
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
import { RentalItem } from '@/lib/types';
import { Calendar as CalendarIcon, PlusCircle } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !item) {
        resetForm();
    }
    setOpen(isOpen);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiryDate) {
        // Ideally show a toast or error message
        console.error("Expiry date is required");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {dialogTrigger}
      <DialogContent className="sm:max-w-2xl">
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
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Food" required />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of the item." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentalRate">Rental Rate (₹)</Label>
                <Input id="rentalRate" type="number" value={rentalRate} onChange={(e) => setRentalRate(e.target.value)} placeholder="e.g., 1200" />
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
              <div className="space-y-2 col-span-2">
                <Label htmlFor="tempRange">Temperature Range</Label>
                <Input id="tempRange" value={tempRange} onChange={(e) => setTempRange(e.target.value)} placeholder="e.g., 2-8°C" />
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
