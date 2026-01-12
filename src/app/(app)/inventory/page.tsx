
'use client';

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rentalItems as initialRentalItems, clients } from "@/lib/data";
import { PlusCircle, Search } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils";
import { RentalItem, Client } from "@/lib/types";
import { AddItemDialog } from "@/components/inventory/add-item-dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react";

export default function InventoryPage() {
    const [rentalItems, setRentalItems] = useState<RentalItem[]>(initialRentalItems);
    const [openCollapsibles, setOpenCollapsibles] = useState<string[]>(clients.map(c => c.id));

    const handleItemAdded = (item: RentalItem) => {
        setRentalItems(prev => {
            const existingIndex = prev.findIndex(i => i.id === item.id);
            if (existingIndex > -1) {
                const updatedItems = [...prev];
                updatedItems[existingIndex] = item;
                return updatedItems;
            }
            return [item, ...prev];
        });
    };

    const itemsByClient = useMemo(() => {
        return clients.map(client => ({
            ...client,
            items: rentalItems.filter(item => item.clientId === client.id)
        })).filter(client => client.items.length > 0);
    }, [rentalItems]);

    const toggleCollapsible = (id: string) => {
        setOpenCollapsibles(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Inventory" description="Manage your clients' food items.">
                <AddItemDialog onItemAdded={handleItemAdded} />
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle>Client Inventory</CardTitle>
                    <CardDescription>A list of all food items stored by your clients.</CardDescription>
                    <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search for items..." className="pl-8" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                    {itemsByClient.map(clientData => (
                        <Collapsible 
                            key={clientData.id} 
                            open={openCollapsibles.includes(clientData.id)}
                            onOpenChange={() => toggleCollapsible(clientData.id)}
                        >
                            <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                                    <h3 className="font-semibold">{clientData.name} ({clientData.items.length} items)</h3>
                                    <ChevronDown className={cn("h-5 w-5 transition-transform", openCollapsibles.includes(clientData.id) && "rotate-180")} />
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="pt-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Image</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Available Qty</TableHead>
                                            <TableHead>Rental Rate (₹)</TableHead>
                                            <TableHead>Condition</TableHead>
                                            <TableHead>Expiry Date</TableHead>
                                            <TableHead>Temp. Range</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientData.items.map(item => {
                                            const isExpiringSoon = (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30;
                                            const isExpired = new Date(item.expiryDate).getTime() < new Date().getTime();

                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                                            <Image 
                                                                src={`https://picsum.photos/seed/${item.id}/100/100`}
                                                                width={48}
                                                                height={48}
                                                                alt={item.name}
                                                                className="object-cover"
                                                                data-ai-hint="food item"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{item.category}</TableCell>
                                                    <TableCell>{item.quantityAvailable} {item.unit}</TableCell>
                                                    <TableCell>₹{item.rentalRate.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={item.condition === 'New' ? 'default' : 'secondary'}>{item.condition}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={cn(isExpiringSoon && 'text-orange-500', isExpired && 'text-red-500 font-semibold')}>
                                                            {new Date(item.expiryDate).toLocaleDateString()}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{item.temperatureRange}</TableCell>
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
                                                                <AddItemDialog onItemAdded={handleItemAdded} item={item} trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>} />
                                                                <DropdownMenuItem>View History</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
