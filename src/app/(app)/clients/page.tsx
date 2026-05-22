'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, Edit, Trash2, FileDown, FileText, Mail, Phone, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddClientDialog } from '@/components/clients/add-client-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { clientsService } from '@/lib/firestore';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    try {
      const data = await clientsService.getAll();
      setClients(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleClientAdded = async (newClient: Client) => {
    try {
      const existing = clients.find((c) => c.id === newClient.id);
      if (existing) {
        await clientsService.update(newClient.id, newClient);
      } else {
        await clientsService.createWithId(newClient);
      }
      await load();
      toast({ title: existing ? 'Client updated' : 'Client added', description: newClient.name });
    } catch {
      toast({ title: 'Error', description: 'Failed to save client.', variant: 'destructive' });
    }
  };

  const handleDelete = async (clientId: string) => {
    try {
      await clientsService.delete(clientId);
      await load();
      toast({ title: 'Client deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete client.', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading clients...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your clients and their rental agreements.">
        <div className="flex gap-2">
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
          <AddClientDialog onClientAdded={handleClientAdded} />
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
          <CardDescription>Comprehensive directory of all registered clients with professional details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Details</TableHead>
                <TableHead>Statutory (GST/PAN)</TableHead>
                <TableHead>Bank Info</TableHead>
                <TableHead>Billing Cycle</TableHead>
                <TableHead>Monthly Rent (₹)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="align-top">
                  <TableCell>
                    <div className="font-bold text-base text-primary uppercase">{client.name}</div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {client.email}</div>}
                      <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {client.phone}</div>
                      <div className="max-w-[200px] truncate">{client.address}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">GSTIN</span>
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{client.gstNumber || 'NOT PROVIDED'}</code>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">PAN</span>
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{client.panNumber || 'NOT PROVIDED'}</code>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.bankDetails?.bankName ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Landmark className="h-3 w-3" /> {client.bankDetails.bankName}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">{client.bankDetails.accountNo}</div>
                      </div>
                    ) : <span className="text-xs text-muted-foreground italic">No bank info</span>}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{client.billingCycle}</Badge></TableCell>
                  <TableCell>
                    <div className="font-bold">₹{client.rentAmount.toLocaleString()}</div>
                    {client.pendingPayment > 0 && <div className="text-[10px] text-destructive font-bold">Pending: ₹{client.pendingPayment.toLocaleString()}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <AddClientDialog client={client} onClientAdded={handleClientAdded} trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4" />Edit Profile</DropdownMenuItem>
                        } />
                        <DropdownMenuItem asChild>
                          <Link href={`/invoices/${client.id}/create`}><FileText className="mr-2 h-4 w-4" />Generate Invoice</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(client.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
