
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
import { Client } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface AddClientDialogProps {
  onClientAdded: (client: Client) => void;
  client?: Client;
  trigger?: React.ReactNode;
}

export function AddClientDialog({ onClientAdded, client, trigger }: AddClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly'>('monthly');
  const [rentAmount, setRentAmount] = useState('');
  const [pendingPayment, setPendingPayment] = useState('');

  useEffect(() => {
    if (client && open) {
      setName(client.name);
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setBillingCycle(client.billingCycle);
      setRentAmount(client.rentAmount.toString());
      setPendingPayment(client.pendingPayment.toString());
    }
  }, [client, open]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setBillingCycle('monthly');
    setRentAmount('');
    setPendingPayment('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !client) {
      resetForm();
    }
    setOpen(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: client?.id || `client_${Date.now()}`,
      name,
      phone,
      address,
      billingCycle,
      rentAmount: parseFloat(rentAmount) || 0,
      pendingPayment: parseFloat(pendingPayment) || 0,
    };
    onClientAdded(newClient);
    setOpen(false);
  };
  
  const dialogTrigger = trigger ? (
    <DialogTrigger asChild onClick={() => setOpen(true)}>{trigger}</DialogTrigger>
  ) : (
    <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Client
        </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {dialogTrigger}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update the details for this client.' : 'Fill in the details for the new client.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Client Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Prestige Catering" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 9876543210" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., 123 Food Street, Bangalore" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="billingCycle">Billing Cycle</Label>
                        <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'weekly' | 'monthly')}>
                            <SelectTrigger id="billingCycle">
                                <SelectValue placeholder="Select cycle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rentAmount">Rent Amount (₹)</Label>
                        <Input id="rentAmount" type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} placeholder="e.g., 50000" />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">{client ? 'Update Client' : 'Add Client'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
