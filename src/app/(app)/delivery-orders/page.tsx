'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deliveryOrders, clients } from "@/lib/data";
import { ClipboardList, Printer, Eye, MoreHorizontal, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";

export default function DeliveryOrdersPage() {
    const [orders] = useState(deliveryOrders);
    const router = useRouter();

    const getClientName = (clientId: string) => {
        return clients.find(c => c.id === clientId)?.name || 'Unknown Client';
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Delivery Orders" description="Manage and print official delivery orders for stock release.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Delivery Order
                </Button>
            </PageHeader>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>View and print delivery orders generated for client releases.</CardDescription>
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
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono font-bold">{order.orderNumber}</TableCell>
                                    <TableCell>{format(order.date, 'dd.MM.yyyy')}</TableCell>
                                    <TableCell className="font-medium">{getClientName(order.clientId)}</TableCell>
                                    <TableCell>{order.driverName}</TableCell>
                                    <TableCell className="font-mono">{order.vehicleNumber}</TableCell>
                                    <TableCell className="font-mono">{order.gatePassNumber}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/delivery-orders/${order.id}/print`)}>
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
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
