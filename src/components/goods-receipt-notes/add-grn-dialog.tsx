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
import type { GoodsReceiptNote, Client } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AddGRNDialogProps {
  clients: Client[];
  onGRNAdded: (grn: GoodsReceiptNote) => void;
}

export function AddGRNDialog({ clients, onGRNAdded }: AddGRNDialogProps) {
  const [open, setOpen] = useState(false);
  const [inwardNumber, setInwardNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [gatePassNumber, setGatePassNumber] = useState('');
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weight, setWeight] = useState('');

  const resetForm = () => {
    setInwardNumber('');
    setClientId('');
    setDriverName('');
    setVehicleNumber('');
    setGatePassNumber('');
    setItemName('');
    setBrand('');
    setQuantity('');
    setWeight('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    const qty = parseInt(quantity) || 0;
    const wt = parseFloat(weight) || 0;

    const selectedClient = clients.find((c) => c.id === clientId);

    const newGRN: GoodsReceiptNote = {
      id: `grn_${Date.now()}`,
      grnNumber: `GRN-${inwardNumber}`,
      inwardNumber,
      date: new Date(),
      clientId,
      address: selectedClient?.address || '',
      driverName,
      vehicleNumber,
      gatePassNumber,
      items: [
        {
          srNo: 1,
          itemName,
          brand,
          batchNumber: 'N/A',
          unit: 'BOX',
          weightPerQty: qty > 0 ? wt / qty : 0,
          quantity: qty,
          weight: wt,
        },
      ],
    };

    onGRNAdded(newGRN);
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New GRN
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">New Goods Receipt Note (GRN)</DialogTitle>
          <DialogDescription>
            Record an official receipt of goods into the cold storage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inwardNumber">Inward No (Inw.No)</Label>
              <Input
                id="inwardNumber"
                value={inwardNumber}
                onChange={(e) => setInwardNumber(e.target.value)}
                placeholder="e.g., 08213"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gatePassNumber">Gate Pass No</Label>
              <Input
                id="gatePassNumber"
                value={gatePassNumber}
                onChange={(e) => setGatePassNumber(e.target.value)}
                placeholder="e.g., 08038"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Customer Name</Label>
              <Select value={clientId} onValueChange={setClientId} required>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., WHIIP CREAM"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., DECOR"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Total Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input
                id="driverName"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Driver Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="MH12 AB 1234"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Generate GRN</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
