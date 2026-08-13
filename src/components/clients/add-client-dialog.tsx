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
import { PlusCircle, Building2, CreditCard, Mail, Phone, Landmark } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';

interface AddClientDialogProps {
  onClientAdded: (client: Client) => void;
  client?: Client;
  trigger?: React.ReactNode;
}

export function AddClientDialog({ onClientAdded, client, trigger }: AddClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [optionalPhone, setOptionalPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  
  // Bank Details
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');

  const [billingCycle, setBillingCycle] = useState<'monthly'>('monthly');
  const [rentAmount, setRentAmount] = useState('');
  const [pendingPayment, setPendingPayment] = useState('');

  useEffect(() => {
    if (client && open) {
      setName(client.name);
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setOptionalPhone(client.optionalPhone || '');
      setAddress(client.address || '');
      setGstNumber(client.gstNumber || '');
      setPanNumber(client.panNumber || '');
      setAccountName(client.bankDetails?.accountName || '');
      setBankName(client.bankDetails?.bankName || '');
      setAccountNo(client.bankDetails?.accountNo || '');
      setIfsc(client.bankDetails?.ifsc || '');
      setBillingCycle(client.billingCycle);
      setRentAmount(client.rentAmount.toString());
      setPendingPayment(client.pendingPayment.toString());
    }
  }, [client, open]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setOptionalPhone('');
    setAddress('');
    setGstNumber('');
    setPanNumber('');
    setAccountName('');
    setBankName('');
    setAccountNo('');
    setIfsc('');
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
      email,
      phone,
      optionalPhone,
      address,
      gstNumber,
      panNumber,
      bankDetails: {
        accountName,
        bankName,
        accountNo,
        ifsc,
      },
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update the details for this client.' : 'Fill in the details for the new client including professional and banking information.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 py-4">
                {/* General Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                        <Building2 className="h-4 w-4" /> General Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="name">Client Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Prestige Catering" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> Email ID
                            </Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Primary Phone
                            </Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Primary contact" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="optionalPhone">Optional Phone</Label>
                            <Input id="optionalPhone" value={optionalPhone} onChange={(e) => setOptionalPhone(e.target.value)} placeholder="Alternate contact" />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full office/billing address" />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Statutory Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                        <CreditCard className="h-4 w-4" /> Statutory Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="gst">GST Number</Label>
                            <Input id="gst" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="15-digit GSTIN" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pan">PAN Card Number</Label>
                            <Input id="pan" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="10-digit PAN" />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Bank Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                        <Landmark className="h-4 w-4" /> Bank Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="accountName">Account Holder Name</Label>
                            <Input id="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="As per bank records" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., HDFC Bank" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accountNo">Account Number</Label>
                            <Input id="accountNo" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="Bank account number" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ifsc">IFSC Code</Label>
                            <Input id="ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="e.g., HDFC0001234" />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Billing Configuration */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-primary">Billing Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="billingCycle">Billing Cycle</Label>
                            <Select value={billingCycle} onValueChange={(v) => setBillingCycle('monthly')}>
                                <SelectTrigger id="billingCycle">
                                    <SelectValue placeholder="Select cycle" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rentAmount">Expected Monthly Rent (₹)</Label>
                            <Input id="rentAmount" type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} placeholder="Base rent" />
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">{client ? 'Update Client' : 'Save Client Profile'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}