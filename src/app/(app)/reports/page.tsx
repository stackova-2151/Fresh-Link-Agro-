'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { rentalItems, clients, chambers } from "@/lib/data";
import { useMemo } from "react";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";

export default function ReportsPage() {
    const inventoryByCategory = useMemo(() => {
        const categoryMap: { [key: string]: number } = {};
        rentalItems.forEach(item => {
            if (!categoryMap[item.category]) {
                categoryMap[item.category] = 0;
            }
            categoryMap[item.category] += item.quantityAvailable;
        });
        return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    }, []);

    const clientFinancials = useMemo(() => {
        return clients.map(client => ({
            name: client.name,
            totalRent: client.rentAmount,
            pendingPayment: client.pendingPayment,
            paid: client.rentAmount - client.pendingPayment,
        }));
    }, []);

    const chamberOccupancy = useMemo(() => {
        return chambers.map(chamber => {
            const capacity = (chamber.boxDimensions?.length || 0) * (chamber.boxDimensions?.width || 0) * (chamber.boxDimensions?.height || 0);
            const occupied = 0; // This needs real data
            const percentage = capacity > 0 ? (occupied / capacity) * 100 : 0;
            return {
                name: chamber.name,
                occupancy: percentage,
            };
        });
    }, []);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-6">
            <PageHeader title="Reports" description="Generate and view reports for inventory, financials, and operations.">
                <div className="flex gap-2">
                    <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export All</Button>
                </div>
            </PageHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Inventory by Category</CardTitle>
                        <CardDescription>Total quantity of items in each category.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[300px] w-full">
                            <BarChart data={inventoryByCategory} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="value" name="Quantity" fill="var(--color-primary)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Chamber Occupancy</CardTitle>
                        <CardDescription>Current storage occupancy for each chamber.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[300px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chamberOccupancy}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="occupancy"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {chamberOccupancy.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                     <Tooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Client Financial Summary</CardTitle>
                    <CardDescription>Overview of rent and payments for all clients.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client Name</TableHead>
                                <TableHead className="text-right">Total Rent (₹)</TableHead>
                                <TableHead className="text-right">Amount Paid (₹)</TableHead>
                                <TableHead className="text-right">Pending Payment (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientFinancials.map(client => (
                                <TableRow key={client.name}>
                                    <TableCell className="font-medium">{client.name}</TableCell>
                                    <TableCell className="text-right">
                                        {client.totalRent.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                        {client.paid.toLocaleString()}
                                    </TableCell>
                                    <TableCell className={cn("text-right", client.pendingPayment > 0 ? "text-destructive" : "")}>
                                        {client.pendingPayment.toLocaleString()}
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