'use client';

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { rentalItems as initialRentalItems, clients } from "@/lib/data";
import { PlusCircle, Search, ChevronDown, MoreHorizontal, FileDown, Printer } from "lucide-react";
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
            item.inwardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [rentalItems, searchTerm]);

    const itemsByClient = useMemo(() => {
        return clients.map(client => {
            const clientItems = filteredItems.filter(item => item.clientId === client.id);
            const summary = clientItems.reduce((acc, item) => {
                acc.totalInQty += item.inwardQuantity;
                acc.totalInWt += item.inwardWeight;
                acc.totalOutQty += item.outwardQuantity;
                acc.totalOutWt += item.outwardWeight;
                acc.totalBalQty += item.quantityAvailable;
                acc.totalBalWt += item.balanceWeight;
                return acc;
            }, { totalInQty: 0, totalInWt: 0, totalOutQty: 0, totalOutWt: 0, totalBalQty: 0, totalBalWt: 0 });

            return {
                ...client,
                items: clientItems,
                summary
            };
        }).filter(client => client.items.length > 0);
    }, [filteredItems]);

    const toggleCollapsible = (id: string) => {
        setOpenCollapsibles(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Inward Register" description="Detailed log of all inward stock entries as per cold storage standards.">
                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print Register</Button>
                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export CSV</Button>
                    <AddItemDialog onItemAdded={handleItemAdded} />
                </div>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle>Register Search</CardTitle>
                    <CardDescription>Search by Inward No, Customer, Item, Brand or Vehicle Number.</CardDescription>
                    <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Type to search entries..." 
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
                            className="border rounded-lg overflow-hidden"
                        >
                            <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-primary">{clientData.name}</Badge>
                                        <span className="text-sm text-muted-foreground">{clientData.items.length} register entries</span>
                                    </div>
                                    <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", openCollapsibles.includes(clientData.id) && "rotate-180")} />
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100/50">
                                            <TableHead className="w-[80px]">Inw.No</TableHead>
                                            <TableHead>Inw.Date</TableHead>
                                            <TableHead>Item Description</TableHead>
                                            <TableHead>Brand</TableHead>
                                            <TableHead>Batch #</TableHead>
                                            <TableHead className="text-right">Inw.Qty</TableHead>
                                            <TableHead className="text-right">Inw.Weight</TableHead>
                                            <TableHead>Driver Name</TableHead>
                                            <TableHead>Vehicle No.</TableHead>
                                            <TableHead className="text-right">Bal.Days</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientData.items.map(item => {
                                            const daysStored = now ? differenceInDays(now, item.storageDate) : 0;

                                            return (
                                                <TableRow key={item.id} className="group">
                                                    <TableCell className="font-mono text-xs">{item.inwardNumber}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{new Date(item.storageDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell><Badge variant="outline">{item.brand}</Badge></TableCell>
                                                    <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                                                    <TableCell className="text-right">{item.inwardQuantity} {item.unit}</TableCell>
                                                    <TableCell className="text-right">{item.inwardWeight.toFixed(2)}</TableCell>
                                                    <TableCell className="text-muted-foreground">{item.driverName || 'N/A'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{item.vehicleNumber || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-semibold text-primary">{daysStored}</TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Register Actions</DropdownMenuLabel>
                                                                <AddItemDialog onItemAdded={handleItemAdded} item={item} trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit Register Entry</DropdownMenuItem>} />
                                                                <DropdownMenuItem>Generate Gate Pass</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive">Delete Entry</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                    <TableFooter className="bg-slate-50 font-headline">
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-right font-bold py-4">CUSTOMER SUMMARY FOR {clientData.name}:</TableCell>
                                            <TableCell className="text-right text-sm">
                                                <div className="font-bold">Total Inward: {clientData.summary.totalInQty}</div>
                                                <div className="text-xs text-muted-foreground">Total Outward: {clientData.summary.totalOutQty}</div>
                                                <div className="text-primary mt-1">Total Balance: {clientData.summary.totalBalQty}</div>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                <div className="font-bold">{clientData.summary.totalInWt.toFixed(2)} kg</div>
                                                <div className="text-xs text-muted-foreground">{clientData.summary.totalOutWt.toFixed(2)} kg</div>
                                                <div className="text-primary mt-1">{clientData.summary.totalBalWt.toFixed(2)} kg</div>
                                            </TableCell>
                                            <TableCell colSpan={4} />
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                                </div>
                                <div className="p-6 bg-slate-50/30 grid grid-cols-2 md:grid-cols-4 gap-4 border-t">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Opening Stock</p>
                                        <p className="text-lg font-headline">38 / 456.00</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Inward</p>
                                        <p className="text-lg font-headline text-green-600">{clientData.summary.totalInQty} / {clientData.summary.totalInWt.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Outward</p>
                                        <p className="text-lg font-headline text-red-600">{clientData.summary.totalOutQty} / {clientData.summary.totalOutWt.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Balance</p>
                                        <p className="text-lg font-headline text-primary font-bold">{clientData.summary.totalBalQty} / {clientData.summary.totalBalWt.toFixed(2)}</p>
                                    </div>
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
