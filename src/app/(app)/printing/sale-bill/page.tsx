'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Printer, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { clientsService } from "@/lib/firestore";
import { generatedBillsService } from "@/lib/firestore";
import type { Client, GeneratedBill } from "@/lib/types";

export default function SaleBillPrintingPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientInput, setClientInput] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  
  const [billDate, setBillDate] = useState<Date>();
  const [billDateOpen, setBillDateOpen] = useState(false);
  
  const [generatedBills, setGeneratedBills] = useState<GeneratedBill[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
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
    setGeneratedBills([]);
    setSelectedBillIds(new Set());
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

  const handleShowAllBills = async () => {
    console.log('========================================================');
    console.log('[FIRESTORE-LOAD] Loading all bills from Firestore');
    console.log('========================================================');
    setLoading(true);
    try {
      const bills = await generatedBillsService.getAll();
      console.log('[FIRESTORE-LOAD] Bills loaded:', bills.length);
      console.log('[FIRESTORE-LOAD] Bill Details:');
      bills.forEach((bill, idx) => {
        console.log(`[FIRESTORE-LOAD] Bill ${idx + 1}:`);
        console.log('[FIRESTORE-LOAD]   Firestore Document ID:', bill.id);
        console.log('[FIRESTORE-LOAD]   GeneratedBill.id:', bill.id);
        console.log('[FIRESTORE-LOAD]   Customer:', bill.clientName);
        console.log('[FIRESTORE-LOAD]   Gross Amount:', bill.grossAmount);
        console.log('[FIRESTORE-LOAD]   Taxable Amount:', bill.taxableAmount);
        console.log('[FIRESTORE-LOAD]   Net Amount:', bill.netAmount);
        console.log('[FIRESTORE-LOAD]   Items Count:', bill.items.length);
        
        // Validate document ID
        if (!bill.id || bill.id === '') {
          console.error('[ERROR] Firestore Document ID is empty for loaded bill');
          console.error('[ERROR] Bill Number:', bill.billNumber);
          console.error('[ERROR] Customer:', bill.clientName);
          console.error('[ERROR] This indicates Firestore read methods are not mapping document.id correctly');
        }
      });
      setGeneratedBills(bills);
      toast({ title: 'Success', description: `Loaded ${bills.length} bills.` });
    } catch (error) {
      console.error('[ERROR] Failed to load bills');
      console.error('[ERROR] Operation: handleShowAllBills');
      console.error('[ERROR] Error Message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('[ERROR] Stack:', error instanceof Error ? error.stack : 'No stack');
      toast({ title: 'Error', description: 'Failed to load bills.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleShowCustomerBills = async () => {
    if (!selectedClient) return;
    
    console.log('========================================================');
    console.log('[FIRESTORE-LOAD] Loading bills for customer');
    console.log('========================================================');
    console.log('[FIRESTORE-LOAD] Customer:', selectedClient.name);
    console.log('[FIRESTORE-LOAD] Client ID:', selectedClient.id);
    
    setLoading(true);
    try {
      const bills = await generatedBillsService.getByClient(selectedClient.id);
      console.log('[FIRESTORE-LOAD] Bills loaded:', bills.length);
      console.log('[FIRESTORE-LOAD] Bill Details:');
      bills.forEach((bill, idx) => {
        console.log(`[FIRESTORE-LOAD] Bill ${idx + 1}:`);
        console.log('[FIRESTORE-LOAD]   Firestore Document ID:', bill.id);
        console.log('[FIRESTORE-LOAD]   GeneratedBill.id:', bill.id);
        console.log('[FIRESTORE-LOAD]   Customer:', bill.clientName);
        console.log('[FIRESTORE-LOAD]   Gross Amount:', bill.grossAmount);
        console.log('[FIRESTORE-LOAD]   Taxable Amount:', bill.taxableAmount);
        console.log('[FIRESTORE-LOAD]   Net Amount:', bill.netAmount);
        console.log('[FIRESTORE-LOAD]   Items Count:', bill.items.length);
        
        // Validate document ID
        if (!bill.id || bill.id === '') {
          console.error('[ERROR] Firestore Document ID is empty for loaded bill');
          console.error('[ERROR] Bill Number:', bill.billNumber);
          console.error('[ERROR] Customer:', bill.clientName);
          console.error('[ERROR] This indicates Firestore read methods are not mapping document.id correctly');
        }
      });
      setGeneratedBills(bills);
      toast({ title: 'Success', description: `Loaded ${bills.length} bills for ${selectedClient.name}.` });
    } catch (error) {
      console.error('[ERROR] Failed to load customer bills');
      console.error('[ERROR] Operation: handleShowCustomerBills');
      console.error('[ERROR] Error Message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('[ERROR] Stack:', error instanceof Error ? error.stack : 'No stack');
      toast({ title: 'Error', description: 'Failed to load bills.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleBillSelect = (billId: string) => {
    console.log('[SALE-BILL] Bill selection changed');
    console.log('[SALE-BILL] Bill ID:', billId);
    setSelectedBillIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
        console.log('[SALE-BILL] Action: DESELECTED');
      } else {
        newSet.add(billId);
        console.log('[SALE-BILL] Action: SELECTED');
      }
      console.log('[SALE-BILL] Selected Bill IDs:', Array.from(newSet));
      return newSet;
    });
  };

  const handleSelectAll = () => {
    console.log('[SALE-BILL] Select All clicked');
    console.log('[SALE-BILL] Total bills:', generatedBills.length);
    console.log('[SALE-BILL] Currently selected:', selectedBillIds.size);
    if (selectedBillIds.size === generatedBills.length) {
      console.log('[SALE-BILL] Action: DESELECT ALL');
      setSelectedBillIds(new Set());
    } else {
      console.log('[SALE-BILL] Action: SELECT ALL');
      const allIds = generatedBills.map((b) => b.id);
      console.log('[SALE-BILL] Selected Bill IDs:', allIds);
      setSelectedBillIds(new Set(allIds));
    }
  };

  const handlePrint = () => {
    console.log('========================================================');
    console.log('[PRINT] Print Selected Bills clicked');
    console.log('========================================================');
    
    if (selectedBillIds.size === 0) {
      console.error('[ERROR] No bills selected for print');
      toast({ title: 'Error', description: 'Please select at least one bill to print.', variant: 'destructive' });
      return;
    }

    const selectedBills = generatedBills.filter((b) => selectedBillIds.has(b.id));
    const billIdsParam = selectedBills.map((b) => b.id).join(',');
    
    console.log('[PRINT] Selected Bills:', selectedBills.length);
    console.log('[PRINT] Bill IDs:', Array.from(selectedBillIds));
    console.log('[PRINT] Generated URL:', `/printing/sale-bill/print?billIds=${billIdsParam}`);
    
    router.push(`/printing/sale-bill/print?billIds=${billIdsParam}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Sale Bill Printing" 
        description="Select and print generated sale bills."
      />
      
      <div className="flex justify-center">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Sale Bill Printing
            </CardTitle>
            <CardDescription>
              Select customer or show all bills, then choose bills to print.
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
                  placeholder="Search customer (optional)"
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
            </div>

            {/* Bill Date */}
            <div className="space-y-2">
              <Label>Bill Date</Label>
              <Popover open={billDateOpen} onOpenChange={setBillDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !billDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {billDate ? format(billDate, "PPP") : "Select bill date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={billDate}
                    onSelect={(date) => {
                      setBillDate(date);
                      setBillDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {selectedClient ? (
                <Button 
                  onClick={handleShowCustomerBills}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Show Bills for {selectedClient.name}
                </Button>
              ) : (
                <Button 
                  onClick={handleShowAllBills}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Show All Bills
                </Button>
              )}
            </div>

            {/* Bills List */}
            {generatedBills.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedBillIds.size === generatedBills.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer">
                    Select All ({selectedBillIds.size} selected)
                  </Label>
                </div>

                <div className="border rounded-md max-h-96 overflow-y-auto">
                  {(() => {
                    console.log('[KEYS] Bill Keys Check');
                    console.log('[KEYS] Array Length:', generatedBills.length);
                    const keys = generatedBills.map(b => b.id);
                    console.log('[KEYS] Keys:', keys);
                    const uniqueKeys = new Set(keys);
                    if (uniqueKeys.size !== keys.length) {
                      console.error('[KEYS] DUPLICATE KEY FOUND');
                      const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
                      console.error('[KEYS] Duplicate Keys:', [...new Set(duplicates)]);
                    }
                    return null;
                  })()}
                  {generatedBills.map((bill) => {
                    console.log('[SALE-BILL] Rendering bill card');
                    console.log('[SALE-BILL] Bill ID:', bill.id);
                    console.log('[SALE-BILL] Customer:', bill.clientName);
                    console.log('[SALE-BILL] Amount displayed:', bill.netAmount.toFixed(2));
                    return (
                      <div
                        key={bill.id}
                        className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${
                          selectedBillIds.has(bill.id) ? 'bg-green-50' : ''
                        }`}
                      >
                        <Checkbox
                          checked={selectedBillIds.has(bill.id)}
                          onCheckedChange={() => handleBillSelect(bill.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{bill.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {bill.billMonth} • {format(new Date(bill.billDate), 'PPP')}
                          </p>
                        </div>
                        <p className="text-sm font-medium">₹{bill.netAmount.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>

                <Button 
                  onClick={handlePrint}
                  disabled={selectedBillIds.size === 0}
                  className="w-full"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Selected Bills ({selectedBillIds.size})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
