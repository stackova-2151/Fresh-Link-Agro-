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

export default function BillProcessingPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientInput, setClientInput] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  
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

  // Client autocomplete
  const handleClientInputChange = useCallback((value: string) => {
    setClientInput(value);
    setSelectedClient(null);

    if (!value.trim()) {
      setFilteredClients([]);
      setShowSuggestions(false);
      setHighlightIndex(0);
      return;
    }

    const results = clients.filter((c) => c.name.toLowerCase().includes(value.toLowerCase()));
    setFilteredClients(results);
    setShowSuggestions(true);
    setHighlightIndex(0);
  }, [clients]);

  const handleClientSelect = useCallback((client: Client) => {
    setSelectedClient(client);
    setClientInput(client.name);
    setShowSuggestions(false);
    setFilteredClients([]);
    setHighlightIndex(0);
  }, []);

  const handleClientKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!showSuggestions || filteredClients.length === 0) return;
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % filteredClients.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!showSuggestions || filteredClients.length === 0) return;
      e.preventDefault();
      setHighlightIndex((prev) => (prev === 0 ? filteredClients.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFilteredClients([]);
      setHighlightIndex(0);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && filteredClients.length > 0) {
        const selected = filteredClients[highlightIndex];
        if (selected) handleClientSelect(selected);
      }
    }
  }, [filteredClients, handleClientSelect, highlightIndex, showSuggestions]);

  const handleGenerateBill = async () => {
    console.log('========================================================');
    console.log('[BILL-START] GENERATE BUTTON CLICKED');
    console.log('========================================================');
    console.log('[BILL-START] Customer:', selectedClient?.name || 'ALL CUSTOMERS');
    console.log('[BILL-START] ClientId:', selectedClient?.id || 'ALL');
    console.log('[BILL-START] Month End Date:', monthEndDate ? new Date(monthEndDate).toLocaleDateString('en-IN') : 'NOT SELECTED');
    console.log('[BILL-START] GST Date:', gstDate ? new Date(gstDate).toLocaleDateString('en-IN') : 'NOT SELECTED');
    
    if (!monthEndDate || !gstDate) {
      console.error('[ERROR] Date validation failed');
      console.error('[ERROR] MonthEndDate:', monthEndDate);
      console.error('[ERROR] GSTDate:', gstDate);
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

      const clientsToProcess = selectedClient ? [selectedClient] : clients;
      const totalClients = clientsToProcess.length;

      console.log('[BILL-START] Billing Month:', billMonth);
      console.log('[BILL-START] Clients to Process:', totalClients);

      for (let i = 0; i < totalClients; i++) {
        const client = clientsToProcess[i];
        const progressPercent = Math.round(((i + 1) / totalClients) * 100);
        
        setProgressMessage(`Processing ${client.name} (${i + 1}/${totalClients})...`);
        setProgress(progressPercent);

        console.log('========================================================');
        console.log(`[BILL-START] Processing Client ${i + 1}/${totalClients}: ${client.name}`);
        console.log('========================================================');
        console.log('[BILL-START] Client ID:', client.id);

        // Check if bill already exists
        console.log('[BILL-START] Checking for existing bills...');
        console.log('[BILL-START] Client ID:', client.id);
        console.log('[BILL-START] Bill Month:', billMonth);
        const existingBills = await generatedBillsService.getByClientAndMonth(client.id, billMonth);
        console.log('[BILL-START] Existing Bill Count:', existingBills.length);
        
        // Validate document IDs in existing bills
        if (existingBills.length > 0) {
          console.log('[BILL-START] Validating existing bill document IDs...');
          existingBills.forEach((bill, idx) => {
            console.log(`[BILL-START] Existing Bill ${idx + 1}:`);
            console.log('[BILL-START]   Firestore Document ID:', bill.id);
            console.log('[BILL-START]   GeneratedBill.id:', bill.id);
            console.log('[BILL-START]   Bill Number:', bill.billNumber);
            
            if (!bill.id || bill.id === '') {
              console.error('[ERROR] Firestore Document ID is empty for existing bill');
              console.error('[ERROR] Bill Number:', bill.billNumber);
              console.error('[ERROR] Client ID:', bill.clientId);
              console.error('[ERROR] Bill Month:', bill.billMonth);
              console.error('[ERROR] This indicates getByClientAndMonth() is not mapping document.id correctly');
            }
          });
        }
        
        // Calculate bill (always recalculate with latest data)
        console.log('[BILL-START] Calling calculateBill()...');
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
          createdBy: 'admin', // TODO: Get from user context
        });
        console.log('[BILL-START] calculateBill() returned');

        // Convert to GeneratedBill, preserving existing bill if found
        const existingBill = existingBills.length > 0 ? existingBills[0] : undefined;
        const bill = billCalculatorV2.convertToGeneratedBill(calculationResult, existingBill);
        
        console.log('[BILL-SAVE] Bill object received from calculator:');
        console.log('[BILL-SAVE]   Bill Number:', bill.billNumber);
        console.log('[BILL-SAVE]   GeneratedBill.id:', bill.id);
        console.log('[BILL-SAVE]   Gross Amount:', bill.grossAmount);
        console.log('[BILL-SAVE]   Net Amount:', bill.netAmount);
        console.log('[BILL-SAVE]   Items Count:', bill.items.length);
        console.log('[BILL-SAVE]   Object keys:', Object.keys(bill));
        console.log('[BILL-SAVE]   Full object:', JSON.stringify(bill, null, 2));

        if (existingBill) {
          // UPDATE EXISTING BILL
          console.log('[BILL] Existing Bill Found');
          console.log('[BILL] Updating Existing Bill');
          
          // Validate Firestore document ID
          if (!existingBill.id || existingBill.id === '') {
            console.error('[ERROR] Firestore Document ID is empty');
            console.error('[ERROR] GeneratedBill.id:', existingBill.id);
            console.error('[ERROR] Bill Number:', existingBill.billNumber);
            console.error('[ERROR] Client ID:', existingBill.clientId);
            console.error('[ERROR] Bill Month:', existingBill.billMonth);
            console.error('[ERROR] This indicates Firestore read methods are not mapping document.id correctly');
            throw new Error('Cannot update bill: Firestore Document ID is empty. Check Firestore service methods (getAll, getByClient, getByClientAndMonth) to ensure they return { id: doc.id, ...doc.data() }');
          }
          
          console.log('[BILL] Firestore Document ID:', existingBill.id);
          console.log('[BILL] GeneratedBill.id:', existingBill.id);
          console.log('[BILL] Bill Number:', existingBill.billNumber);
          console.log('[BILL] Old Gross Amount:', existingBill.grossAmount);
          console.log('[BILL] New Gross Amount:', bill.grossAmount);
          console.log('[BILL] Old Net Amount:', existingBill.netAmount);
          console.log('[BILL] New Net Amount:', bill.netAmount);
          
          // Prepare update data - keep same bill number and ID
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
            lastCalculatedAt: new Date().toISOString()
          };

          console.log('[FIRESTORE-SAVE] Updating existing bill in Firestore...');
          console.log('[FIRESTORE-SAVE] Collection: generatedBills');
          console.log('[FIRESTORE-SAVE] Document ID:', existingBill.id);
          console.log('[FIRESTORE-SAVE] Bill Number:', existingBill.billNumber);
          
          try {
            await generatedBillsService.update(existingBill.id, updateData);
            console.log('[FIRESTORE-SAVE] Update Completed Successfully');
            console.log('[BILL] UpdatedAt:', new Date().toISOString());
          } catch (updateError) {
            console.error('[ERROR] Firestore Update Failed');
            console.error('[ERROR] Operation: generatedBillsService.update');
            console.error('[ERROR] Document ID:', existingBill.id);
            console.error('[ERROR] Error Message:', updateError instanceof Error ? updateError.message : 'Unknown error');
            console.error('[ERROR] Stack:', updateError instanceof Error ? updateError.stack : 'No stack');
            throw updateError;
          }
        } else {
          // CREATE NEW BILL
          console.log('[BILL] Creating New Monthly Bill');
          console.log('[BILL] Bill Number:', bill.billNumber);
          console.log('[BILL] Customer:', client.name);
          console.log('[BILL] Billing Month:', billMonth);
          
          // Save to Firestore
          console.log('[FIRESTORE-SAVE] Saving new bill to Firestore...');
          console.log('[FIRESTORE-SAVE] Collection: generatedBills');
          console.log('[FIRESTORE-SAVE] Bill Number:', bill.billNumber);
          console.log('[FIRESTORE-SAVE] Gross Amount:', bill.grossAmount);
          console.log('[FIRESTORE-SAVE] Net Amount:', bill.netAmount);
          
          try {
            const savedBill = await generatedBillsService.create(bill);
            
            // Validate Firestore document ID was assigned
            if (!savedBill.id || savedBill.id === '') {
              console.error('[ERROR] Firestore did not assign Document ID');
              console.error('[ERROR] GeneratedBill.id:', savedBill.id);
              console.error('[ERROR] Bill Number:', savedBill.billNumber);
              console.error('[ERROR] This indicates Firestore create() method is not returning the document ID');
              throw new Error('Firestore create did not assign Document ID. Check Firestore service create() method to ensure it returns { id: ref.id, ...data }');
            }
            
            console.log('[FIRESTORE-SAVE] Firestore Document ID:', savedBill.id);
            console.log('[FIRESTORE-SAVE] GeneratedBill.id:', savedBill.id);
            console.log('[FIRESTORE-SAVE] Saved Document:');
            console.log('[FIRESTORE-SAVE]', JSON.stringify(savedBill, null, 2));
            console.log('[FIRESTORE-SAVE] Save Completed Successfully');
          } catch (saveError) {
            console.error('[ERROR] Firestore Save Failed');
            console.error('[ERROR] Operation: generatedBillsService.create');
            console.error('[ERROR] Error Message:', saveError instanceof Error ? saveError.message : 'Unknown error');
            console.error('[ERROR] Stack:', saveError instanceof Error ? saveError.stack : 'No stack');
            throw saveError;
          }
        }
      }

      setProgress(100);
      setProgressMessage('Complete!');
      
      console.log('========================================================');
      console.log('[BILL-START] BILL GENERATION COMPLETE');
      console.log('[BILL-START] Total Clients Processed:', totalClients);
      console.log('========================================================');
      console.log('[BILL-START] FINAL RUNTIME SUMMARY');
      console.log('[BILL-START] ====================');
      console.log('[BILL-START] Flow: Calculation → Check Existing → Update/Create → Firestore → Load → Display');
      console.log('[BILL-START] Architecture: One Customer + One Month = One Bill (Update on regenerate)');
      console.log('[BILL-START] Check console logs above for any value changes between stages');
      console.log('[BILL-START] Look for [BILL-CALC], [BILL-SAVE], [FIRESTORE-SAVE], [FIRESTORE-LOAD], [SALE-BILL] prefixes');
      console.log('========================================================');
      
      toast({ 
        title: 'Success', 
        description: `Bills generated/updated for ${totalClients} customers.` 
      });

      // Reset form
      setSelectedClient(null);
      setClientInput('');
      setMonthEndDate(undefined);
      setGstDate(undefined);
    } catch (error) {
      console.error('[ERROR] BILL GENERATION ERROR');
      console.error('[ERROR] Operation: handleGenerateBill');
      console.error('[ERROR] Error Message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('[ERROR] Stack:', error instanceof Error ? error.stack : 'No stack');
      
      toast({ 
        title: 'Error', 
        description: 'Failed to generate bills.', 
        variant: 'destructive' 
      });
    } finally {
      setGenerating(false);
      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 2000);
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
                  value={clientInput}
                  onChange={(e) => handleClientInputChange(e.target.value)}
                  onKeyDown={handleClientKeyDown}
                  placeholder="Search customer (optional - leave blank for all customers)"
                  className="w-full"
                />
                {showSuggestions && filteredClients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredClients.map((client, index) => (
                      <div
                        key={client.id}
                        className={`px-4 py-2 cursor-pointer ${
                          index === highlightIndex ? 'bg-sky-100' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleClientSelect(client)}
                      >
                        {client.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                className="bg-sky-500 hover:bg-sky-600"
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
