'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Receipt, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { clientsService } from "@/lib/firestore";
import { generatedBillsService } from "@/lib/firestore";
import type { Client, GeneratedBill } from "@/lib/types";
import { useClientAutocomplete } from "@/hooks/use-client-autocomplete";

export default function BillProcessingPage() {
  const [clients, setClients] = useState<Client[]>([]);

  const clientAC = useClientAutocomplete({
    clients,
    onSelect: () => {}, // selectedClient read from clientAC.selectedClient
  });
  
  const [monthEndDate, setMonthEndDate] = useState<Date>();
  const [gstDate, setGstDate] = useState<Date>();
  const [monthEndOpen, setMonthEndOpen] = useState(false);
  const [gstOpen, setGstOpen] = useState(false);
  
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  const { toast } = useToast();

  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await clientsService.getAll();
        setClients(data);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
      }
    };
    loadClients();
  }, [toast]);

  // Set default GST date to 5th of NEXT month after month end date
  useEffect(() => {
    if (monthEndDate) {
      const gstDefault = new Date(monthEndDate.getFullYear(), monthEndDate.getMonth() + 1, 5);
      setGstDate(gstDefault);
    }
  }, [monthEndDate]);



  const handleGenerateBill = async () => {
    if (!monthEndDate || !gstDate) {
      toast({ title: 'Error', description: 'Please select month end date and GST date.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setProgressMessage('Initializing...');

    try {
      const billMonth = format(monthEndDate, 'yyyy-MM');
      const monthEndDateIso = monthEndDate.toISOString();
      const gstDateIso = gstDate.toISOString();
      const billDateIso = new Date().toISOString();

      const clientsToProcess = clientAC.selectedClient ? [clientAC.selectedClient] : clients;
      const totalClients = clientsToProcess.length;

      for (let i = 0; i < totalClients; i++) {
        const client = clientsToProcess[i];
        setProgressMessage(`Processing ${client.name} (${i + 1}/${totalClients})...`);
        setProgress(Math.round(((i + 1) / totalClients) * 100));

        const existingBills = await generatedBillsService.getByClientAndMonth(client.id, billMonth);
        
        const { billCalculatorV2 } = await import('@/lib/bill-calculator-v2');
        const calculationResult = await billCalculatorV2.calculateBill({
          clientId: client.id,
          clientName: client.name,
          clientGstNumber: client.gstNumber,
          clientAddress: client.address,
          monthEndDate: monthEndDateIso,
          gstDate: gstDateIso,
          billDate: billDateIso,
          billMonth,
          createdBy: 'admin',
        });

        const existingBill = existingBills.length > 0 ? existingBills[0] : undefined;
        const bill = billCalculatorV2.convertToGeneratedBill(calculationResult, existingBill);

        if (existingBill) {
          if (!existingBill.id) throw new Error('Cannot update bill: Firestore Document ID is empty.');
          const updateData: Partial<GeneratedBill> = {
            items: bill.items,
            grossAmount: bill.grossAmount,
            varai: bill.varai,
            uL: bill.uL,
            taxableAmount: bill.taxableAmount,
            cgst: bill.cgst,
            sgst: bill.sgst,
            roundOff: bill.roundOff,
            netAmount: bill.netAmount,
            amountInWords: bill.amountInWords,
            charges: bill.charges,
            hasInwardThisMonth: bill.hasInwardThisMonth,
            inwardCount: bill.inwardCount,
            updatedAt: new Date().toISOString(),
            lastCalculatedAt: new Date().toISOString(),
          };
          await generatedBillsService.update(existingBill.id, updateData);
        } else {
          const savedBill = await generatedBillsService.create(bill);
          if (!savedBill.id) throw new Error('Firestore create did not assign Document ID.');
        }
      }

      setProgress(100);
      setProgressMessage('Complete!');
      toast({ title: 'Success', description: `Bills generated/updated for ${totalClients} customers.` });

      clientAC.clearSelection();
      setMonthEndDate(undefined);
      setGstDate(undefined);
    } catch (error) {
      console.error('Bill generation error:', error);
      toast({ title: 'Error', description: 'Failed to generate bills.', variant: 'destructive' });
    } finally {
      setGenerating(false);
      setTimeout(() => { setProgress(0); setProgressMessage(''); }, 2000);
    }
  };

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
              <div className="relative">
                <Input
                  id="customer"
                  type="text"
                  value={clientAC.inputValue}
                  onChange={clientAC.handleInputChange}
                  onKeyDown={clientAC.handleKeyDown}
                  onBlur={clientAC.handleBlur}
                  onFocus={clientAC.handleFocus}
                  placeholder="Search customer (optional - leave blank for all customers)"
                  className="w-full"
                />
                {clientAC.isOpen && clientAC.suggestions.length > 0 && (
                  <div ref={clientAC.listRef} className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {clientAC.suggestions.map((client, index) => (
                      <div key={client.id} {...clientAC.getSuggestionProps(client, index)}>
                        {client.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {clientAC.selectedClient && (
                <p className="text-sm text-muted-foreground">
                  Selected: {clientAC.selectedClient.name}
                </p>
              )}
            </div>

            {/* Month End Date */}
            <div className="space-y-2">
              <Label>Month End Date <span className="required-star">*</span></Label>
              <Popover open={monthEndOpen} onOpenChange={setMonthEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !monthEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-teal-600" />
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
              <Label>GST Date <span className="required-star">*</span></Label>
              <Popover open={gstOpen} onOpenChange={setGstOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !gstDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-teal-600" />
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

            {/* Progress Indicator */}
            {generating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Generating Bills</span>
                </div>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground">{progressMessage}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                onClick={handleGenerateBill}
                disabled={!monthEndDate || !gstDate || generating}
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="mr-2 h-4 w-4" />
                )}
                Generate Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
