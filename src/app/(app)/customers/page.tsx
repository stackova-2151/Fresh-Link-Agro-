
'use client'

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { clients as initialClients, rentalItems } from "@/lib/data";
import { Client, RentalItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>(initialClients);

    const getItemsForClient = (clientId: string): RentalItem[] => {
        return rentalItems.filter(item => item.clientId === clientId);
    }
    
    return (
        <div className="space-y-6">
            <PageHeader title="Clients" description="Manage your clients and their rental agreements.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Client
                </Button>
            </PageHeader>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {clients.map(client => {
                    const clientItems = getItemsForClient(client.id);
                    const totalItems = clientItems.reduce((acc, item) => acc + item.quantityAvailable, 0);
                    const paymentProgress = client.rentAmount > 0 ? ((client.rentAmount - client.pendingPayment) / client.rentAmount) * 100 : 0;

                    return (
                        <Card key={client.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="font-headline">{client.name}</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/>Edit Client</DropdownMenuItem>
                                            <DropdownMenuItem>Generate Invoice</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Client</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardDescription>Billing Cycle: <Badge variant="secondary">{client.billingCycle}</Badge></CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">Monthly Rent</h4>
                                    <p className="text-2xl font-bold">₹{client.rentAmount.toLocaleString()}</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">Pending Payments</h4>
                                    <p className={cn("text-lg font-semibold", client.pendingPayment > 0 ? "text-destructive" : "text-green-600")}>
                                        ₹{client.pendingPayment.toLocaleString()}
                                    </p>
                                    <div>
                                        <Progress value={paymentProgress} className="h-2" />
                                        <p className="text-xs text-muted-foreground mt-1">{paymentProgress.toFixed(0)}% paid</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">{totalItems} items in storage</p>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
