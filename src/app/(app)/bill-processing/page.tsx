'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, FileText, Receipt } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { clients } from "@/lib/data";

export default function BillProcessingPage() {
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [monthEndDate, setMonthEndDate] = useState<Date>();
    const [gstDate, setGstDate] = useState<Date>();
    const [monthEndOpen, setMonthEndOpen] = useState(false);
    const [gstOpen, setGstOpen] = useState(false);

    const handlePreview = () => {
        // UI-only for now - future preview functionality
        console.log('Preview clicked', { selectedClientId, monthEndDate, gstDate });
    };

    const handleGenerateBill = () => {
        // UI-only for now - future bill generation functionality
        console.log('Generate Bill clicked', { selectedClientId, monthEndDate, gstDate });
    };

    const selectedClient = clients.find(c => c.id === selectedClientId);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Month End Bill Processing" 
                description="Generate monthly storage and billing process."
            />
            
            <div className="flex justify-center">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Bill Processing Form
                        </CardTitle>
                        <CardDescription>
                            Select customer and billing period to generate monthly bills.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Customer Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="customer">Customer Name</Label>
                            <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                                <SelectTrigger id="customer">
                                    <SelectValue placeholder="Select a customer (optional - leave blank for all customers)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedClient && (
                                <p className="text-sm text-muted-foreground">
                                    Selected: {selectedClient.name}
                                </p>
                            )}
                        </div>

                        {/* Month End Date */}
                        <div className="space-y-2">
                            <Label>Month End Date *</Label>
                            <Popover open={monthEndOpen} onOpenChange={setMonthEndOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !monthEndDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {monthEndDate ? format(monthEndDate, "PPP") : "Select month end date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={monthEndDate}
                                        onSelect={(date) => {
                                            setMonthEndDate(date);
                                            setMonthEndOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* GST Date */}
                        <div className="space-y-2">
                            <Label>GST Date *</Label>
                            <Popover open={gstOpen} onOpenChange={setGstOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !gstDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {gstDate ? format(gstDate, "PPP") : "Select GST date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={gstDate}
                                        onSelect={(date) => {
                                            setGstDate(date);
                                            setGstOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button 
                                variant="outline" 
                                onClick={handlePreview}
                                disabled={!monthEndDate || !gstDate}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                Preview
                            </Button>
                            <Button 
                                onClick={handleGenerateBill}
                                disabled={!monthEndDate || !gstDate}
                            >
                                <Receipt className="mr-2 h-4 w-4" />
                                Generate Bill
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}