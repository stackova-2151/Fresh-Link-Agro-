'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { clientsService } from '@/lib/firestore';
import { generateInwardWiseStockReport, getInwardNumbersByCustomer, getItemNamesByInward } from '@/lib/services/stock-report.service';
import type { Client } from '@/lib/types';
import type { StockReportInwardWiseData, StockReportInwardWiseRow } from '@/lib/types/stock-report';
import { PageHeader } from '@/components/page-header';
import { useRouter } from 'next/navigation';

export default function StockReportInwardWisePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientInput, setClientInput] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [clientHighlightIndex, setClientHighlightIndex] = useState(0);

  const [inwardNumbers, setInwardNumbers] = useState<string[]>([]);
  const [selectedInwardNo, setSelectedInwardNo] = useState<string | null>(null);
  const [inwardInput, setInwardInput] = useState<string>('');
  const [filteredInwards, setFilteredInwards] = useState<string[]>([]);
  const [showInwardSuggestions, setShowInwardSuggestions] = useState(false);
  const [inwardHighlightIndex, setInwardHighlightIndex] = useState(0);

  const [itemNames, setItemNames] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [itemInput, setItemInput] = useState<string>('');
  const [filteredItems, setFilteredItems] = useState<string[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [itemHighlightIndex, setItemHighlightIndex] = useState(0);

  const [reportData, setReportData] = useState<StockReportInwardWiseData | null>(null);
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

  // Load inward numbers when client changes
  useEffect(() => {
    const loadInwardNumbers = async () => {
      if (!selectedClient) {
        setInwardNumbers([]);
        return;
      }
      try {
        const numbers = await getInwardNumbersByCustomer(selectedClient.id);
        setInwardNumbers(numbers);
        // Reset inward and item selection when client changes
        setSelectedInwardNo(null);
        setInwardInput('');
        setFilteredInwards([]);
        setShowInwardSuggestions(false);
        setSelectedItem(null);
        setItemInput('');
        setFilteredItems([]);
        setShowItemSuggestions(false);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load inward numbers.', variant: 'destructive' });
      }
    };
    loadInwardNumbers();
  }, [selectedClient, toast]);

  // Load item names when inward number changes
  useEffect(() => {
    const loadItemNames = async () => {
      if (!selectedInwardNo) {
        setItemNames([]);
        return;
      }
      try {
        const names = await getItemNamesByInward(selectedInwardNo);
        setItemNames(names);
        // Reset item selection when inward changes
        setSelectedItem(null);
        setItemInput('');
        setFilteredItems([]);
        setShowItemSuggestions(false);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load item names.', variant: 'destructive' });
      }
    };
    loadItemNames();
  }, [selectedInwardNo, toast]);

  // Client autocomplete
  const handleClientInputChange = useCallback((value: string) => {
    setClientInput(value);
    setSelectedClient(null);

    if (!value.trim()) {
      setFilteredClients([]);
      setShowClientSuggestions(false);
      setClientHighlightIndex(0);
      return;
    }

    const results = clients.filter((c) => c.name.toLowerCase().includes(value.toLowerCase()));
    setFilteredClients(results);
    setShowClientSuggestions(true);
    setClientHighlightIndex(0);
  }, [clients]);

  const handleClientSelect = useCallback((client: Client) => {
    setSelectedClient(client);
    setClientInput(client.name);
    setShowClientSuggestions(false);
    setFilteredClients([]);
    setClientHighlightIndex(0);
    setReportData(null);
  }, []);

  const handleClientKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!showClientSuggestions || filteredClients.length === 0) return;
      e.preventDefault();
      setClientHighlightIndex((prev) => (prev + 1) % filteredClients.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!showClientSuggestions || filteredClients.length === 0) return;
      e.preventDefault();
      setClientHighlightIndex((prev) => (prev === 0 ? filteredClients.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Escape') {
      setShowClientSuggestions(false);
      setFilteredClients([]);
      setClientHighlightIndex(0);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showClientSuggestions && filteredClients.length > 0) {
        const selected = filteredClients[clientHighlightIndex];
        if (selected) handleClientSelect(selected);
      }
    }
  }, [filteredClients, handleClientSelect, clientHighlightIndex, showClientSuggestions]);

  // Inward number autocomplete
  const handleInwardInputChange = useCallback((value: string) => {
    setInwardInput(value);
    setSelectedInwardNo(null);

    if (!value.trim()) {
      setFilteredInwards([]);
      setShowInwardSuggestions(false);
      setInwardHighlightIndex(0);
      return;
    }

    const results = inwardNumbers.filter((i) => i.toLowerCase().includes(value.toLowerCase()));
    setFilteredInwards(results);
    setShowInwardSuggestions(true);
    setInwardHighlightIndex(0);
  }, [inwardNumbers]);

  const handleInwardSelect = useCallback((inwardNo: string) => {
    setSelectedInwardNo(inwardNo);
    setInwardInput(inwardNo);
    setShowInwardSuggestions(false);
    setFilteredInwards([]);
    setInwardHighlightIndex(0);
    setReportData(null);
  }, []);

  const handleInwardKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!showInwardSuggestions || filteredInwards.length === 0) return;
      e.preventDefault();
      setInwardHighlightIndex((prev) => (prev + 1) % filteredInwards.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!showInwardSuggestions || filteredInwards.length === 0) return;
      e.preventDefault();
      setInwardHighlightIndex((prev) => (prev === 0 ? filteredInwards.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Escape') {
      setShowInwardSuggestions(false);
      setFilteredInwards([]);
      setInwardHighlightIndex(0);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showInwardSuggestions && filteredInwards.length > 0) {
        const selected = filteredInwards[inwardHighlightIndex];
        if (selected) handleInwardSelect(selected);
      }
    }
  }, [filteredInwards, handleInwardSelect, inwardHighlightIndex, showInwardSuggestions]);

  // Item name autocomplete
  const handleItemInputChange = useCallback((value: string) => {
    setItemInput(value);
    setSelectedItem(null);

    if (!value.trim()) {
      setFilteredItems([]);
      setShowItemSuggestions(false);
      setItemHighlightIndex(0);
      return;
    }

    const results = itemNames.filter((i) => i.toLowerCase().includes(value.toLowerCase()));
    setFilteredItems(results);
    setShowItemSuggestions(true);
    setItemHighlightIndex(0);
  }, [itemNames]);

  const handleItemSelect = useCallback((item: string) => {
    setSelectedItem(item);
    setItemInput(item);
    setShowItemSuggestions(false);
    setFilteredItems([]);
    setItemHighlightIndex(0);
  }, []);

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!showItemSuggestions || filteredItems.length === 0) return;
      e.preventDefault();
      setItemHighlightIndex((prev) => (prev + 1) % filteredItems.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!showItemSuggestions || filteredItems.length === 0) return;
      e.preventDefault();
      setItemHighlightIndex((prev) => (prev === 0 ? filteredItems.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Escape') {
      setShowItemSuggestions(false);
      setFilteredItems([]);
      setItemHighlightIndex(0);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showItemSuggestions && filteredItems.length > 0) {
        const selected = filteredItems[itemHighlightIndex];
        if (selected) handleItemSelect(selected);
      }
    }
  }, [filteredItems, handleItemSelect, itemHighlightIndex, showItemSuggestions]);

  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedClient || !selectedInwardNo) {
      toast({ title: 'Validation Error', description: 'Customer Name and Inward No are required.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = await generateInwardWiseStockReport({
        customerId: selectedClient.id,
        inwardNo: selectedInwardNo,
        itemName: selectedItem || undefined
      });
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({ title: 'Error', description: 'Failed to generate report.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Clear form
  const handleClear = () => {
    setSelectedClient(null);
    setClientInput('');
    setFilteredClients([]);
    setShowClientSuggestions(false);
    setSelectedInwardNo(null);
    setInwardInput('');
    setFilteredInwards([]);
    setShowInwardSuggestions(false);
    setSelectedItem(null);
    setItemInput('');
    setFilteredItems([]);
    setShowItemSuggestions(false);
    setReportData(null);
  };

  // Print
  const handlePrint = () => {
    if (!selectedClient || !selectedInwardNo) return;
    const params = new URLSearchParams();
    params.set('customerId', selectedClient.id);
    params.set('inwardNo', selectedInwardNo);
    if (selectedItem) params.set('itemName', selectedItem);
    router.push(`/printing/stock-report/inward-wise/print?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inward Wise Stock Report"
        description="View outward history for a specific inward entry"
      />

      <Card className="max-w-4xl mx-auto border shadow-sm">
        <CardHeader className="py-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label>Customer Name <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                placeholder="Type customer name..."
                value={clientInput}
                onChange={(e) => handleClientInputChange(e.target.value)}
                onKeyDown={handleClientKeyDown}
                onFocus={() => {
                  if (filteredClients.length > 0) setShowClientSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowClientSuggestions(false), 0);
                }}
              />
              {showClientSuggestions && filteredClients.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow">
                  {filteredClients.map((c, index) => (
                    <div
                      key={c.id}
                      className={`cursor-pointer px-3 py-2 text-sm ${
                        index === clientHighlightIndex ? 'bg-muted' : ''
                      }`}
                      onMouseDown={() => handleClientSelect(c)}
                      onMouseEnter={() => setClientHighlightIndex(index)}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Inward No */}
          <div className="space-y-2">
            <Label>Inward No <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                placeholder="Type inward number..."
                value={inwardInput}
                onChange={(e) => handleInwardInputChange(e.target.value)}
                onKeyDown={handleInwardKeyDown}
                disabled={!selectedClient}
                onFocus={() => {
                  if (filteredInwards.length > 0) setShowInwardSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowInwardSuggestions(false), 0);
                }}
              />
              {showInwardSuggestions && filteredInwards.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow">
                  {filteredInwards.map((inwardNo, index) => (
                    <div
                      key={inwardNo}
                      className={`cursor-pointer px-3 py-2 text-sm ${
                        index === inwardHighlightIndex ? 'bg-muted' : ''
                      }`}
                      onMouseDown={() => handleInwardSelect(inwardNo)}
                      onMouseEnter={() => setInwardHighlightIndex(index)}
                    >
                      {inwardNo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Item Name (Optional) */}
          <div className="space-y-2">
            <Label>Item Name (Optional)</Label>
            <div className="relative">
              <Input
                placeholder="Type item name..."
                value={itemInput}
                onChange={(e) => handleItemInputChange(e.target.value)}
                onKeyDown={handleItemKeyDown}
                disabled={!selectedInwardNo}
                onFocus={() => {
                  if (filteredItems.length > 0) setShowItemSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowItemSuggestions(false), 0);
                }}
              />
              {showItemSuggestions && filteredItems.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow">
                  {filteredItems.map((itemName, index) => (
                    <div
                      key={itemName}
                      className={`cursor-pointer px-3 py-2 text-sm ${
                        index === itemHighlightIndex ? 'bg-muted' : ''
                      }`}
                      onMouseDown={() => handleItemSelect(itemName)}
                      onMouseEnter={() => setItemHighlightIndex(index)}
                    >
                      {itemName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={handleGenerateReport} disabled={loading || !selectedClient || !selectedInwardNo}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {reportData && (
        <Card className="max-w-6xl mx-auto border shadow-sm">
          <CardHeader className="py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Report Results</CardTitle>
              <CardDescription>Inward No: {reportData.inwardNo} | Customer: {reportData.customerName}</CardDescription>
            </div>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </CardHeader>
          <CardContent>
            {/* Report Summary */}
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Customer:</span> {reportData.customerName}
                </div>
                <div>
                  <span className="font-semibold">Gir No:</span> {reportData.gatePassNo || '-'}
                </div>
                <div>
                  <span className="font-semibold">Inward No:</span> {reportData.inwardNo}
                </div>
                <div>
                  <span className="font-semibold">Inward Date:</span> {reportData.inwardDate}
                </div>
                {reportData.selectedItemName && (
                  <div>
                    <span className="font-semibold">Item Name:</span> {reportData.selectedItemName}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Total Inward Qty:</span> {reportData.totalInwardQty}
                </div>
                <div>
                  <span className="font-semibold">Total Inward Weight:</span> {reportData.totalInwardWeight.toFixed(2)} KG
                </div>
                <div>
                  <span className="font-semibold">Total Outward Qty:</span> {reportData.totalOutwardQty}
                </div>
                <div>
                  <span className="font-semibold">Total Outward Weight:</span> {reportData.totalOutwardWeight.toFixed(2)} KG
                </div>
                <div>
                  <span className="font-semibold">Current Balance Qty:</span> {reportData.totalBalanceQty}
                </div>
                <div>
                  <span className="font-semibold">Current Balance Weight:</span> {reportData.totalBalanceWeight.toFixed(2)} KG
                </div>
              </div>
            </div>

            {/* Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="px-3 py-2 text-left font-semibold">Item Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Out No</th>
                    <th className="px-3 py-2 text-left font-semibold">Out Date</th>
                    <th className="px-3 py-2 text-right font-semibold">Out Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Out Weight</th>
                    <th className="px-3 py-2 text-right font-semibold">Bal Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Bal Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let currentItemKey = '';
                    return reportData.rows.map((row, index) => {
                      const itemKey = `${row.itemName}-${row.brand || ''}-${row.batch || ''}`;
                      const isFirstRowOfItem = itemKey !== currentItemKey;
                      currentItemKey = itemKey;

                      return (
                        <tr
                          key={index}
                          className={`border-b ${
                            row.rowType === 'INWARD' ? 'bg-blue-50 font-semibold' : ''
                          }`}
                        >
                          <td className="px-3 py-2 uppercase">
                            {isFirstRowOfItem ? row.itemName : ''}
                          </td>
                          <td className="px-3 py-2 font-mono">{row.outwardNo || '-'}</td>
                          <td className="px-3 py-2">{row.outwardDate || '-'}</td>
                          <td className="px-3 py-2 text-right">{row.outwardQty ?? '-'}</td>
                          <td className="px-3 py-2 text-right">{row.outwardWeight ? row.outwardWeight.toFixed(2) : '-'}</td>
                          <td className="px-3 py-2 text-right font-semibold">{row.balanceQty.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{row.balanceWeight.toFixed(2)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
