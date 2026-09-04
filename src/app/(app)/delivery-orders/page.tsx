'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, Printer, Eye, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddDeliveryOrderDialog } from '@/components/delivery-orders/add-delivery-order-dialog';
import type { DeliveryOrder, Client, RentalItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { deliveryOrdersService, clientsService, rentalItemsService } from '@/lib/firestore';

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const load = async () => {
    try {
      const [data, clientList, itemList] = await Promise.all([
        deliveryOrdersService.getAll(),
        clientsService.getAll(),
        rentalItemsService.getAll(),
      ]);
      setOrders(data);
      setClients(clientList);
      setRentalItems(itemList);
      const names: Record<string, string> = {};
      clientList.forEach((c) => {
        names[c.id] = c.name;
      });
      setClientNames(names);
    } catch {
      toast({ title: 'Error', description: 'Failed to load delivery orders.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddOrder = async (newOrder: DeliveryOrder) => {
    try {
      await deliveryOrdersService.createWithId(newOrder);
      await load();
      toast({ title: 'Delivery order created' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save delivery order.', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Orders"
        description="Manage and print official delivery orders for stock release."
      >
        <AddDeliveryOrderDialog
          clients={clients}
          rentalItems={rentalItems}
          onOrderAdded={handleAddOrder}
        />
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            View and print delivery orders generated for client releases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order # (OutNo)</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle No.</TableHead>
                <TableHead>Gate Pass #</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="table-row-hover">
                  <TableCell className="font-mono font-bold">{order.orderNumber}</TableCell>
                  <TableCell>{format(new Date(order.date), 'dd.MM.yyyy')}</TableCell>
                  <TableCell className="font-medium">
                    {clientNames[order.clientId] || 'Unknown'}
                  </TableCell>
                  <TableCell>{order.driverName}</TableCell>
                  <TableCell className="font-mono">{order.vehicleNumber}</TableCell>
                  <TableCell className="font-mono">{order.gatePassNumber}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="kebab-btn h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => router.push(`/delivery-orders/${order.id}/print`)}
                        >
                          <Printer className="mr-2 h-4 w-4" /> Print / Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No delivery orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
