'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { outwardEntries as initialOutwardEntries, clients } from "@/lib/data";
import { Search, Printer, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/user-context";
import { format } from "date-fns";
import { AddOutwardDialog } from "@/components/outward/add-outward-dialog";
import { OutwardEntry } from "@/lib/types";

export default function OutwardRegisterPage() {
    const { user } = useUser();
    const [entries, setEntries] = useState<OutwardEntry[]>(initialOutwardEntries);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredEntries = useMemo(() => {
        let filtered = entries;
        if (searchTerm) {
            filtered = entries.filter(entry => 
                entry.outwardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (clients.find(c => c.id === entry.clientId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return [...filtered].sort((a, b) => b.outwardDate.getTime() - a.outwardDate.getTime());
    }, [entries, searchTerm]);

    const getClientName = (clientId: string) => {
        return clients.find(c => c.id === clientId)?.name || 'Unknown';
    };

    const totalQty = filteredEntries.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalWt = filteredEntries.reduce((acc, curr) => acc + curr.weight, 0);

    const handlePrint = () => {
        window.print();
    };

    const handleAddOutward = (newEntry: OutwardEntry) => {
        setEntries(prev => [newEntry, ...prev]);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Outward Register" description="Log of all stock outward movements for tracking and auditing.">
                <div className="flex gap-2 print:hidden">
                    {user?.role === 'Admin' && (
                        <Button variant="outline" onClick={handlePrint}>
                            <FileDown className="mr-2 h-4 w-4" /> Download PDF
                        </Button>
                    )}
                    <Button onClick={handlePrint} variant="outline">
                        <Printer className="mr-2 h-4 w-4" /> Print Register
                    </Button>
                    <AddOutwardDialog onOutwardAdded={handleAddOutward} />
                </div>
            </PageHeader>

            <Card className="print:shadow-none print:border-none">
                <CardHeader className="print:pb-0">
                    <div className="flex justify-between items-center print:block print:text-center">
                        <div>
                            <CardTitle className="font-headline text-xl">FRESH LINK AGRO COLD STORAGE PVT. LTD.</CardTitle>
                            <CardDescription className="font-bold text-slate-800">OUTWARD REGISTER</CardDescription>
                            <p className="text-xs text-muted-foreground">AS ON DATE : {format(new Date(), 'dd.MM.yyyy')}</p>
                        </div>
                        <div className="relative pt-2 w-72 print:hidden">
                            <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search outward records..." 
                                className="pl-8" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="print:p-0">
                    <Table className="border print:text-[10px]">
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[80px] font-bold border">OutNo</TableHead>
                                <TableHead className="font-bold border">Out Date</TableHead>
                                <TableHead className="font-bold border">Customer Name</TableHead>
                                <TableHead className="font-bold border">InwNo</TableHead>
                                <TableHead className="font-bold border">Item Description</TableHead>
                                <TableHead className="font-bold border">Brand</TableHead>
                                <TableHead className="text-right font-bold border">OutQty</TableHead>
                                <TableHead className="text-right font-bold border">Out Wt</TableHead>
                                <TableHead className="font-bold border">Driver Name</TableHead>
                                <TableHead className="font-bold border">Vehicle No.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEntries.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-transparent">
                                    <TableCell className="border font-mono">{entry.outwardNumber}</TableCell>
                                    <TableCell className="border whitespace-nowrap">{format(entry.outwardDate, 'dd.MM.yyyy')}</TableCell>
                                    <TableCell className="border font-semibold">{getClientName(entry.clientId)}</TableCell>
                                    <TableCell className="border font-mono">{entry.inwardNumber}</TableCell>
                                    <TableCell className="border">{entry.itemName}</TableCell>
                                    <TableCell className="border"><Badge variant="outline" className="rounded-none font-bold text-[9px]">{entry.brand}</Badge></TableCell>
                                    <TableCell className="border text-right">{entry.quantity}</TableCell>
                                    <TableCell className="border text-right">{entry.weight.toFixed(2)}</TableCell>
                                    <TableCell className="border uppercase">{entry.driverName}</TableCell>
                                    <TableCell className="border font-mono uppercase">{entry.vehicleNumber}</TableCell>
                                </TableRow>
                            ))}
                            {filteredEntries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                                        No outward entries found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        <TableFooter className="bg-slate-100/50">
                            <TableRow>
                                <TableCell colSpan={6} className="text-right font-bold border">PAGE TOTAL / GRAND TOTAL:</TableCell>
                                <TableCell className="text-right font-bold border">{totalQty}</TableCell>
                                <TableCell className="text-right font-bold border">{totalWt.toFixed(2)}</TableCell>
                                <TableCell colSpan={2} className="border" />
                            </TableRow>
                        </TableFooter>
                    </Table>
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
