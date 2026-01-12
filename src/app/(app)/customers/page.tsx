
'use client'

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { customers as initialCustomers, rentalItems } from "@/lib/data";
import { Customer, RentalItem } from "@/lib/types";
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

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

    const getItemsForCustomer = (customerId: string): RentalItem[] => {
        return rentalItems.filter(item => item.customerId === customerId);
    }
    
    return (
        <div className="space-y-6">
            <PageHeader title="Customers" description="Manage your customers and their rental agreements.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Customer
                </Button>
            </PageHeader>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {customers.map(customer => {
                    const customerItems = getItemsForCustomer(customer.id);
                    const totalItems = customerItems.reduce((acc, item) => acc + item.quantityAvailable, 0);
                    const paymentProgress = customer.rentAmount > 0 ? ((customer.rentAmount - customer.pendingPayment) / customer.rentAmount) * 100 : 0;

                    return (
                        <Card key={customer.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="font-headline">{customer.name}</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/>Edit Customer</DropdownMenuItem>
                                            <DropdownMenuItem>Generate Invoice</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Customer</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardDescription>Billing Cycle: <Badge variant="secondary">{customer.billingCycle}</Badge></CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">Monthly Rent</h4>
                                    <p className="text-2xl font-bold">₹{customer.rentAmount.toLocaleString()}</p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">Pending Payments</h4>
                                    <p className={cn("text-lg font-semibold", customer.pendingPayment > 0 ? "text-destructive" : "text-green-600")}>
                                        ₹{customer.pendingPayment.toLocaleString()}
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
