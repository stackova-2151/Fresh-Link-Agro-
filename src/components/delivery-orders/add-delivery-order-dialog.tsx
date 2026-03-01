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
import { DeliveryOrder, RentalItem, Client } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { clients, rentalItems } from '@/lib/data';

interface AddDeliveryOrderDialogProps {
  onOrderAdded: (order: DeliveryOrder) => void;
}

export function AddDeliveryOrderDialog({ onOrderAdded }: AddDeliveryOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [selectedInwardId, setSelectedInwardId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [gatePassNumber, setGatePassNumber] = useState('');
  const [address, setAddress] = useState('');

  const clientInwardItems = rentalItems.filter(item => item.clientId === clientId && item.quantityAvailable > 0);
  const selectedInwardItem = clientInwardItems.find(item => item.id === selectedInwardId);

  const resetForm = () => {
    setOrderNumber('');
    setClientId('');
    setSelectedInwardId('');
    setQuantity('');
    setWeight('');
    setDriverName('');
    setVehicleNumber('');
    setGatePassNumber('');
    setAddress('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !selectedInwardItem) return;

    const qty = parseInt(quantity) || 0;
    const wt = parseFloat(weight) || 0;

    const newOrder: DeliveryOrder = {
      id: `do_${Date.now()}`,
      orderNumber,
      date: new Date(),
      clientId,
      address,
      driverName,
      vehicleNumber,
      gatePassNumber,
      items: [
        {
          srNo: 1,
          itemName: selectedInwardItem.name,
          inwardNumber: selectedInwardItem.inwardNumber,
          brand: selectedInwardItem.brand,
          quantity: qty,
          unit: selectedInwardItem.unit.toUpperCase(),
          weight: wt,
          balanceQty: selectedInwardItem.quantityAvailable - qty,
          balanceWeight: selectedInwardItem.balanceWeight - wt,
        }
      ]
    };

    onOrderAdded(newOrder);
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Delivery Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Create Delivery Order</DialogTitle>
          <DialogDescription>
            Generate an official release order for stock delivery.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order No (Out No)</Label>
                <Input id="orderNumber" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="e.g., 24709" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gatePassNumber">Gate Pass No</Label>
                <Input id="gatePassNumber" value={gatePassNumber} onChange={(e) => setGatePassNumber(e.target.value)} placeholder="e.g., 08038" required />
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
                <Label htmlFor="inwardRef">Stock to Release (InwNo)</Label>
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

              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Delivery Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., Market Yard, Pune" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className='space-y-2'>
                    <Label htmlFor="quantity">Qty to Release</Label>
                    <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor="weight">Weight to Release (kg)</Label>
                    <Input id="weight" type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="driverName">Driver Name</Label>
                 <Input id="driverName" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver Name" required />
              </div>

              <div className="space-y-2">
                 <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                 <Input id="vehicleNumber" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="MH12 AB 1234" required />
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Generate Delivery Order</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
