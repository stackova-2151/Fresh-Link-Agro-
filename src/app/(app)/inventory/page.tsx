'use client';

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rentalItems as initialRentalItems, clients } from "@/lib/data";
import { PlusCircle, Search, ChevronDown, MoreHorizontal, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";
import { RentalItem, Client } from "@/lib/types";
import { AddItemDialog } from "@/components/inventory/add-item-dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "@/components/ui/collapsible"
import { differenceInDays } from "date-fns";

export default function InventoryPage() {
    const [rentalItems, setRentalItems] = useState<RentalItem[]>(initialRentalItems);
    const [openCollapsibles, setOpenCollapsibles] = useState<string[]>(clients.map(c => c.id));
    const [searchTerm, setSearchTerm] = useState("");
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
    }, []);

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

    const filteredItems = useMemo(() => {
        if (!searchTerm) return rentalItems;
        return rentalItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.inwardNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [rentalItems, searchTerm]);

    const itemsByClient = useMemo(() => {
        return clients.map(client => ({
            ...client,
            items: filteredItems.filter(item => item.clientId === client.id)
        })).filter(client => client.items.length > 0);
    }, [filteredItems]);

    const toggleCollapsible = (id: string) => {
        setOpenCollapsibles(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Stock Report" description="Chamberwise customer stock report and management.">
                <div className="flex gap-2">
                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export Report</Button>
                    <AddItemDialog onItemAdded={handleItemAdded} />
                </div>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle>Customer Stock Report</CardTitle>
                    <CardDescription>Consolidated view of all items stored across chambers.</CardDescription>
                    <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by Item, Brand, Batch or Inward No..." 
                            className="pl-8" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                <div className="flex items-center justify-between p-3 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                    <h3 className="font-semibold text-lg">{clientData.name}</h3>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline" className="bg-background">{clientData.items.length} Entries</Badge>
                                        <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", openCollapsibles.includes(clientData.id) && "rotate-180")} />
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="pt-4 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="font-bold">Inv. No</TableHead>
                                            <TableHead className="font-bold">Inw. Date</TableHead>
                                            <TableHead className="font-bold">Item Description</TableHead>
                                            <TableHead className="font-bold">Brand</TableHead>
                                            <TableHead className="font-bold">Batch #</TableHead>
                                            <TableHead className="text-right font-bold">Inw. Qty</TableHead>
                                            <TableHead className="text-right font-bold">Out Qty</TableHead>
                                            <TableHead className="text-right font-bold">Bal. Qty</TableHead>
                                            <TableHead className="text-right font-bold">Inw. Wt</TableHead>
                                            <TableHead className="text-right font-bold">Out Wt</TableHead>
                                            <TableHead className="text-right font-bold">Bal. Wt</TableHead>
                                            <TableHead className="text-right font-bold">Bal. Day</TableHead>
                                            <TableHead className="text-right font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientData.items.map(item => {
                                            const daysStored = now ? differenceInDays(now, item.storageDate) : 0;

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-mono text-xs">{item.inwardNumber}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{new Date(item.storageDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{item.brand}</TableCell>
                                                    <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                                                    <TableCell className="text-right">{item.inwardQuantity}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{item.outwardQuantity}</TableCell>
                                                    <TableCell className="text-right font-bold">{item.quantityAvailable}</TableCell>
                                                    <TableCell className="text-right">{item.inwardWeight.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{item.outwardWeight.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-bold">{item.balanceWeight.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-semibold text-primary">{daysStored}</TableCell>
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
                                                                <AddItemDialog onItemAdded={handleItemAdded} item={item} trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit Entry</DropdownMenuItem>} />
                                                                <DropdownMenuItem>View Transactions</DropdownMenuItem>
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
