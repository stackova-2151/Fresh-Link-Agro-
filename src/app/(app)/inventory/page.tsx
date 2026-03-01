'use client';

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { rentalItems as initialRentalItems, clients, chambers } from "@/lib/data";
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

    const getChamberName = (id?: string) => {
        return chambers.find(c => c.id === id)?.name || 'N/A';
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Stock Report (Chamberwise)" description="Detailed inventory tracking with real-time inward, outward and balance reconciliation.">
                <div className="flex gap-2 print:hidden">
                    <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print Register</Button>
                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export CSV</Button>
                    <AddItemDialog onItemAdded={handleItemAdded} />
                </div>
            </PageHeader>
            <Card className="print:shadow-none print:border-none">
                <CardHeader className="print:pb-0 print:text-center">
                    <CardTitle className="font-headline text-xl">FRESH LINK AGRO COLD STORAGE PVT. LTD.</CardTitle>
                    <CardDescription className="font-bold text-slate-800">CUSTOMER STOCK REPORT CHAMBERWISE AS ON DATE {now?.toLocaleDateString()}</CardDescription>
                    <div className="relative pt-2 print:hidden">
                        <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by Inw No, Brand, or Item..." 
                            className="pl-8" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="print:p-0">
                    <div className="space-y-8">
                    {itemsByClient.map(clientData => (
                        <Collapsible 
                            key={clientData.id} 
                            open={openCollapsibles.includes(clientData.id)}
                            onOpenChange={() => toggleCollapsible(clientData.id)}
                            className="border rounded-lg overflow-hidden print:border-none"
                        >
                            <CollapsibleTrigger className="w-full print:hidden">
                                <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-primary">{clientData.name}</Badge>
                                        <span className="text-sm text-muted-foreground">{clientData.items.length} register entries</span>
                                    </div>
                                    <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", openCollapsibles.includes(clientData.id) && "rotate-180")} />
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="data-[state=open]:block">
                                <div className="p-4 bg-slate-50/50 hidden print:block border-b font-bold uppercase text-sm">
                                    Customer: {clientData.name}
                                </div>
                                <div className="overflow-x-auto">
                                <Table className="print:text-[10px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-100/50">
                                            <TableHead className="w-[80px] border">Inw.No</TableHead>
                                            <TableHead className="border">Inw.Date</TableHead>
                                            <TableHead className="border">Chamber</TableHead>
                                            <TableHead className="border">Item Description</TableHead>
                                            <TableHead className="border">Brand</TableHead>
                                            <TableHead className="border">Batch #</TableHead>
                                            <TableHead className="text-right border">Inw.Qty</TableHead>
                                            <TableHead className="text-right border">Out.Qty</TableHead>
                                            <TableHead className="text-right border">Bal.Qty</TableHead>
                                            <TableHead className="text-right border">Inw.Weight</TableHead>
                                            <TableHead className="text-right border">Out.Weight</TableHead>
                                            <TableHead className="text-right border">Bal.Weight</TableHead>
                                            <TableHead className="text-right border">Bal.Day</TableHead>
                                            <TableHead className="text-right border print:hidden">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientData.items.map(item => {
                                            const daysStored = now ? differenceInDays(now, item.storageDate) : 0;

                                            return (
                                                <TableRow key={item.id} className="hover:bg-transparent">
                                                    <TableCell className="font-mono text-[10px] border">{item.inwardNumber}</TableCell>
                                                    <TableCell className="whitespace-nowrap border">{new Date(item.storageDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="border">{getChamberName(item.chamberId)}</TableCell>
                                                    <TableCell className="font-medium border">{item.name}</TableCell>
                                                    <TableCell className="border font-bold">{item.brand}</TableCell>
                                                    <TableCell className="font-mono text-[10px] border">{item.batchNumber || '-'}</TableCell>
                                                    <TableCell className="text-right border">{item.inwardQuantity}</TableCell>
                                                    <TableCell className="text-right border">{item.outwardQuantity || '0'}</TableCell>
                                                    <TableCell className="text-right font-bold border">{item.quantityAvailable}</TableCell>
                                                    <TableCell className="text-right border">{item.inwardWeight.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right border">{item.outwardWeight.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-bold border">{item.balanceWeight.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-semibold text-primary border">{daysStored}</TableCell>
                                                    <TableCell className="text-right border print:hidden">
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
                                            <TableCell colSpan={6} className="text-right font-bold border py-4 uppercase">Total</TableCell>
                                            <TableCell className="text-right font-bold border">{clientData.summary.totalInQty}</TableCell>
                                            <TableCell className="text-right font-bold border">{clientData.summary.totalOutQty}</TableCell>
                                            <TableCell className="text-right font-bold border text-primary">{clientData.summary.totalBalQty}</TableCell>
                                            <TableCell className="text-right font-bold border">{clientData.summary.totalInWt.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold border">{clientData.summary.totalOutWt.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold border text-primary">{clientData.summary.totalBalWt.toFixed(2)}</TableCell>
                                            <TableCell colSpan={2} className="border print:hidden" />
                                            <TableCell className="border hidden print:table-cell" />
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                    </div>
                </CardContent>
            </Card>

            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    .print\\:hidden { display: none !important; }
                    header, footer, nav, aside { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                    .card { border: none !important; box-shadow: none !important; }
                    @page { margin: 1cm; size: landscape; }
                }
            `}</style>
        </div>
    );
}
