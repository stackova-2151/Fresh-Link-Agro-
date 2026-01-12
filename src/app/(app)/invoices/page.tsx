'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MoreHorizontal, Download, Send, Eye } from "lucide-react";
import { invoices as initialInvoices, clients } from "@/lib/data";
import { Invoice } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
    const router = useRouter();

    const getClientName = (clientId: string) => {
        return clients.find(c => c.id === clientId)?.name || 'Unknown Client';
    };

    const handleSendInvoice = (invoice: Invoice) => {
        alert(`Sharing options for ${invoice.invoiceNumber}:\n- Send via Email\n- Send via WhatsApp`);
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Invoices" description="View and manage all your invoices." />
            <Card>
                <CardHeader>
                    <CardTitle>Invoice History</CardTitle>
                    <CardDescription>A complete record of all generated invoices.</CardDescription>
                </CardHeader>
                <CardContent>
                    {invoices.length > 0 ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount (₹)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{getClientName(invoice.clientId)}</TableCell>
                                        <TableCell>{format(invoice.date, 'PPP')}</TableCell>
                                        <TableCell>{format(invoice.dueDate, 'PPP')}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                invoice.status === 'Paid' ? 'default' :
                                                invoice.status === 'Overdue' ? 'destructive' : 'secondary'
                                            } className={cn(
                                                invoice.status === 'Paid' && 'bg-green-100 text-green-800',
                                                invoice.status === 'Pending' && 'bg-yellow-100 text-yellow-800',
                                            )}>
                                                {invoice.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">₹{invoice.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.clientId}/create`)}>
                                                        <Eye className="mr-2 h-4 w-4" /> View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Download className="mr-2 h-4 w-4" /> Download PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                                                        <Send className="mr-2 h-4 w-4" /> Send/Share
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <FileText className="h-12 w-12 mb-4" />
                            <h3 className="text-xl font-semibold">No Invoices Found</h3>
                            <p className="max-w-md">
                               Invoices you generate will appear here. You can generate a new invoice from the Clients page.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
