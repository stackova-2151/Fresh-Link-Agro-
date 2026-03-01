'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { goodsReceiptNotes as initialNotes, clients } from "@/lib/data";
import { Printer, Eye, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { AddGRNDialog } from '@/components/goods-receipt-notes/add-grn-dialog';
import { GoodsReceiptNote } from '@/lib/types';

export default function GoodsReceiptNotesPage() {
    const [notes, setNotes] = useState<GoodsReceiptNote[]>(initialNotes);
    const router = useRouter();

    const getClientName = (clientId: string) => {
        return clients.find(c => c.id === clientId)?.name || 'Unknown Client';
    };

    const handleAddGRN = (newNote: GoodsReceiptNote) => {
        setNotes(prev => [newNote, ...prev]);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Goods Receipt Notes" description="View and manage official GRNs for inward stock.">
                <AddGRNDialog onGRNAdded={handleAddGRN} />
            </PageHeader>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Receipts</CardTitle>
                    <CardDescription>Official goods receipt notes generated upon inward entry.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Inw. No</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Vehicle No.</TableHead>
                                <TableHead>Gate Pass #</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notes.map((note) => (
                                <TableRow key={note.id}>
                                    <TableCell className="font-mono font-bold">{note.inwardNumber}</TableCell>
                                    <TableCell>{format(new Date(note.date), 'dd.MM.yyyy')}</TableCell>
                                    <TableCell className="font-medium">{getClientName(note.clientId)}</TableCell>
                                    <TableCell>{note.driverName}</TableCell>
                                    <TableCell className="font-mono">{note.vehicleNumber}</TableCell>
                                    <TableCell className="font-mono">{note.gatePassNumber}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/goods-receipt-notes/${note.id}/print`)}>
                                                    <Printer className="mr-2 h-4 w-4" /> Print GRN
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {notes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        No goods receipt notes found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
