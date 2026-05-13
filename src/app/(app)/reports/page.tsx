'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rentalItems, clients, chambers, outwardEntries } from "@/lib/data";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Filter, FileText, MapPin, Package, ClipboardList, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState("itemwise");

    // Report 2a: Itemwise Stock Report
    const itemwiseStock = useMemo(() => {
        const items: { [key: string]: any } = {};
        rentalItems.forEach(item => {
            if (!items[item.name]) {
                items[item.name] = { name: item.name, qty: 0, weight: 0, entries: 0 };
            }
            items[item.name].qty += item.quantityAvailable;
            items[item.name].weight += item.balanceWeight;
            items[item.name].entries += 1;
        });
        return Object.values(items);
    }, []);

    // Report 2b: Locationwise Stock Report
    const locationwiseStock = useMemo(() => {
        const locations: { [key: string]: any } = {};
        rentalItems.forEach(item => {
            const chamberName = chambers.find(c => c.id === item.chamberId)?.name || 'Unassigned';
            const locKey = `${chamberName} - ${item.block || 'No Block'} - ${item.zone || 'No Zone'}`;
            if (!locations[locKey]) {
                locations[locKey] = { location: locKey, qty: 0, weight: 0, items: [] };
            }
            locations[locKey].qty += item.quantityAvailable;
            locations[locKey].weight += item.balanceWeight;
            locations[locKey].items.push(item.name);
        });
        return Object.values(locations);
    }, []);

    // Report 4: Billing Summary (15/30 days)
    const billingSummary = useMemo(() => {
        return clients.map(client => ({
            name: client.name,
            cycle: client.billingCycle,
            lastBill: "05.02.2026",
            pending: client.pendingPayment,
            status: client.pendingPayment > 0 ? "Pending" : "Cleared"
        }));
    }, []);

    // Operation Data (Audit Log simulation)
    const auditLogs = [
        { id: 1, user: "Alex (Admin)", action: "Generated Invoice #02163", time: "2026-02-05 10:30 AM", ip: "192.168.1.45" },
        { id: 2, user: "Maria (Storekeeper)", action: "Added Inward #08213", time: "2026-01-09 02:15 PM", ip: "192.168.1.12" },
        { id: 3, user: "Chen (Gatekeeper)", action: "Created Gate Pass GP-2401-001", time: "2026-01-09 01:50 PM", ip: "192.168.1.8" },
        { id: 4, user: "System", action: "Daily Backup Completed Automatically", time: "2026-02-06 12:00 AM", ip: "Server" },
    ];

    return (
        <ProtectedRoute allowedRoles={["MASTER_ADMIN", "ADMIN"]}>
            <div className="space-y-6">
                <PageHeader title="Stock Report" description="Comprehensive operational and financial reporting as per requirements.">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.print()}><FileText className="mr-2 h-4 w-4" /> Print PDF</Button>
                        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                    </div>
                </PageHeader>
            
            <Tabs defaultValue="itemwise" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto gap-2 bg-transparent p-0">
                    <TabsTrigger value="itemwise" className="data-[state=active]:bg-primary data-[state=active]:text-white border"><Package className="h-4 w-4 mr-2" /> Itemwise</TabsTrigger>
                    <TabsTrigger value="locationwise" className="data-[state=active]:bg-primary data-[state=active]:text-white border"><MapPin className="h-4 w-4 mr-2" /> Locationwise</TabsTrigger>
                    <TabsTrigger value="registers" className="data-[state=active]:bg-primary data-[state=active]:text-white border"><ClipboardList className="h-4 w-4 mr-2" /> Registers</TabsTrigger>
                    <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-white border"><FileText className="h-4 w-4 mr-2" /> Billing</TabsTrigger>
                    <TabsTrigger value="audit" className="data-[state=active]:bg-primary data-[state=active]:text-white border"><ShieldCheck className="h-4 w-4 mr-2" /> Audit Log</TabsTrigger>
                </TabsList>

                {/* Report 2a: Itemwise */}
                <TabsContent value="itemwise" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Report (Itemwise)</CardTitle>
                            <CardDescription>Consolidated stock levels for each food item across all chambers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Item Description</TableHead>
                                        <TableHead className="text-right">Total Bal Qty</TableHead>
                                        <TableHead className="text-right">Total Bal Weight (kg)</TableHead>
                                        <TableHead className="text-right">Register Entries</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemwiseStock.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-bold">{item.name}</TableCell>
                                            <TableCell className="text-right font-mono">{item.qty}</TableCell>
                                            <TableCell className="text-right font-mono">{item.weight.toFixed(2)}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{item.entries}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Report 2b: Locationwise */}
                <TabsContent value="locationwise" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Report (Locationwise)</CardTitle>
                            <CardDescription>Stock distribution by Chamber, Block, and Zone.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Storage Location</TableHead>
                                        <TableHead>Items Stored</TableHead>
                                        <TableHead className="text-right">Bal Qty</TableHead>
                                        <TableHead className="text-right">Bal Weight (kg)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {locationwiseStock.map((loc, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-semibold text-primary">{loc.location}</TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate">{Array.from(new Set(loc.items)).join(", ")}</TableCell>
                                            <TableCell className="text-right font-mono">{loc.qty}</TableCell>
                                            <TableCell className="text-right font-mono">{loc.weight.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Report 2d: Registers Summary */}
                <TabsContent value="registers" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Inward Summary</CardTitle>
                                <CardDescription>Total inward entries today: {rentalItems.filter(i => i.storageDate.toDateString() === new Date().toDateString()).length}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {rentalItems.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm border-b pb-2">
                                            <div>
                                                <p className="font-bold">{item.inwardNumber} - {item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.brand}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono">{item.inwardQuantity} {item.unit}</p>
                                                <p className="text-[10px]">{format(item.storageDate, 'dd.MM.yyyy')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Outward Summary</CardTitle>
                                <CardDescription>Total releases today: {outwardEntries.filter(e => e.outwardDate.toDateString() === new Date().toDateString()).length}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {outwardEntries.slice(0, 3).map((entry, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm border-b pb-2">
                                            <div>
                                                <p className="font-bold">{entry.outwardNumber} - {entry.itemName}</p>
                                                <p className="text-xs text-muted-foreground">Inw Ref: {entry.inwardNumber}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono">{entry.quantity}</p>
                                                <p className="text-[10px]">{format(entry.outwardDate, 'dd.MM.yyyy')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Report 4: Billing Summary */}
                <TabsContent value="billing" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Billing Cycle Report (15/30 Days)</CardTitle>
                            <CardDescription>Track client billing periods and payment statuses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Client Name</TableHead>
                                        <TableHead>Billing Cycle</TableHead>
                                        <TableHead>Last Bill Date</TableHead>
                                        <TableHead className="text-right">Pending Amount (₹)</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {billingSummary.map((bill, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-bold">{bill.name}</TableCell>
                                            <TableCell className="capitalize"><Badge variant="outline">{bill.cycle}</Badge></TableCell>
                                            <TableCell>{bill.lastBill}</TableCell>
                                            <TableCell className="text-right font-mono text-destructive">₹{bill.pending.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge className={bill.status === "Cleared" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                                    {bill.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Report: Operation Data / Audit Log */}
                <TabsContent value="audit" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Operation Data & Audit Logs</CardTitle>
                                <CardDescription>Detailed trail of all logins and software operations.</CardDescription>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">Automatic Backup: ACTIVE</Badge>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>User / Source</TableHead>
                                        <TableHead>Operation / Action</TableHead>
                                        <TableHead className="text-right">Access Point</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs font-mono">{log.time}</TableCell>
                                            <TableCell className="font-medium">{log.user}</TableCell>
                                            <TableCell className="text-sm">{log.action}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground font-mono">{log.ip}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <style jsx global>{`
                @media print {
                    .tabs-list, button, header, nav { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                    .card { border: none !important; box-shadow: none !important; }
                    @page { margin: 1.5cm; }
                }
            `}</style>
            </div>
        </ProtectedRoute>
    );
}
