
'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { clients, rentalItems } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { Download, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import { format } from 'date-fns';

export default function CreateInvoicePage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const client = clients.find(c => c.id === clientId);
  const clientItems = rentalItems.filter(item => item.clientId === clientId);
  
  const invoiceDetails = useMemo(() => {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
    const invoiceDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(invoiceDate.getDate() + 30);

    const items = clientItems.map(item => ({
      name: item.name,
      quantity: item.quantityAvailable,
      unit: item.unit,
      rate: item.rentalRate,
      amount: item.quantityAvailable * item.rentalRate,
    }));

    const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
    const taxRate = 0.18; // 18% GST
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    return { invoiceNumber, invoiceDate, dueDate, items, subtotal, tax, total };
  }, [clientItems]);


  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create Invoice" description={`Review and generate a new invoice for ${client.name}.`}>
        <div className="flex gap-2">
            <Button variant="outline"><Download className="mr-2 h-4 w-4"/> Download PDF</Button>
            <Button><Send className="mr-2 h-4 w-4"/> Send Invoice</Button>
        </div>
      </PageHeader>
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary">INVOICE</h1>
              <p className="text-muted-foreground">{invoiceDetails.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">{client.name}</h2>
              <p className="text-sm text-muted-foreground">{client.address}</p>
              <p className="text-sm text-muted-foreground">{client.phone}</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4">
             <div className="grid gap-1">
                <span className="text-sm font-semibold">Invoice Date:</span>
                <span className="text-sm">{format(invoiceDetails.invoiceDate, 'PPP')}</span>
             </div>
             <div className="grid gap-1 text-right">
                <span className="text-sm font-semibold">Due Date:</span>
                <span className="text-sm">{format(invoiceDetails.dueDate, 'PPP')}</span>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Item Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Rate (₹)</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceDetails.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.quantity} {item.unit}</TableCell>
                  <TableCell>{item.rate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="p-6">
            <div className="w-full space-y-4">
                <Separator />
                <div className="flex justify-end">
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>₹{invoiceDetails.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>GST (18%)</span>
                            <span>₹{invoiceDetails.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                         <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>₹{invoiceDetails.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Previous Balance</span>
                            <span className="text-muted-foreground">₹{client.pendingPayment.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl text-primary">
                            <span>Amount Due</span>
                            <span>₹{(invoiceDetails.total + client.pendingPayment).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
