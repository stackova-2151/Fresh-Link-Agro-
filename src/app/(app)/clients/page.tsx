
'use client'

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { clients as initialClients } from "@/lib/data";
import { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, Edit, Trash2, FileUp, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AddClientDialog } from "@/components/clients/add-client-dialog";

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>(initialClients);

    const handleClientAdded = (newClient: Client) => {
        setClients(prevClients => {
            const existingIndex = prevClients.findIndex(c => c.id === newClient.id);
            if (existingIndex > -1) {
                const updatedClients = [...prevClients];
                updatedClients[existingIndex] = newClient;
                return updatedClients;
            }
            return [newClient, ...prevClients];
        });
    };

    const handleDeleteClient = (clientId: string) => {
        setClients(prev => prev.filter(c => c.id !== clientId));
    }
    
    return (
        <div className="space-y-6">
            <PageHeader title="Clients" description="Manage your clients and their rental agreements.">
                <div className="flex gap-2">
                    <Button variant="outline"><FileUp className="mr-2 h-4 w-4" /> Import</Button>
                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
                    <AddClientDialog onClientAdded={handleClientAdded} />
                </div>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle>Client List</CardTitle>
                    <CardDescription>A list of all your clients.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Billing Cycle</TableHead>
                                <TableHead>Monthly Rent (₹)</TableHead>
                                <TableHead>Pending Payment (₹)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.map(client => (
                                <TableRow key={client.id}>
                                    <TableCell className="font-medium">{client.name}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">{client.phone}</div>
                                        <div className="text-xs text-muted-foreground">{client.address}</div>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{client.billingCycle}</Badge></TableCell>
                                    <TableCell>₹{client.rentAmount.toLocaleString()}</TableCell>
                                    <TableCell className={cn(client.pendingPayment > 0 ? "text-destructive" : "")}>
                                        ₹{client.pendingPayment.toLocaleString()}
                                    </TableCell>
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
                                                <AddClientDialog 
                                                    client={client} 
                                                    onClientAdded={handleClientAdded} 
                                                    trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>} 
                                                />
                                                <DropdownMenuItem>Generate Invoice</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClient(client.id)}>
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
    )
}
