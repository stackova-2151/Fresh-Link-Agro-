'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { clientsService } from '@/lib/firestore';
import { generateStockReportItemWise, getUniqueItemNames } from '@/lib/services/stock-report.service';
import type { Client } from '@/lib/types';
import type { StockReportItemWiseData, StockReportItemGroup, StockReportItemRow } from '@/lib/types/stock-report';
import { format } from 'date-fns';
import { PrintHeader } from '@/components/print/PrintHeader';

export default function StockReportItemWisePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientInput, setClientInput] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [clientHighlightIndex, setClientHighlightIndex] = useState(0);

  const [itemNames, setItemNames] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [itemInput, setItemInput] = useState<string>('');
  const [filteredItems, setFilteredItems] = useState<string[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [itemHighlightIndex, setItemHighlightIndex] = useState(0);

  const [reportType, setReportType] = useState<'all' | 'bal'>('all');
  const [asOnDate, setAsOnDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const [reportData, setReportData] = useState<StockReportItemWiseData | null>(null);
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

  // Load item names on mount and when client changes
  useEffect(() => {
    const loadItemNames = async () => {
      try {
        const names = await getUniqueItemNames(selectedClient?.id);
        setItemNames(names);
        // Reset item selection when client changes
        setSelectedItem(null);
        setItemInput('');
        setFilteredItems([]);
        setShowItemSuggestions(false);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load item names.', variant: 'destructive' });
      }
    };
    loadItemNames();
  }, [selectedClient, toast]);

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

  // Item autocomplete
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
    setReportData(null);
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

  const handleShowReport = async () => {
    setLoading(true);
    try {
      const data = await generateStockReportItemWise({
        customerId: selectedClient?.id,
        itemName: selectedItem || undefined,
        asOnDate: asOnDate,
        reportType: reportType,
      });
      setReportData(data);

      if (data.itemGroups.length === 0) {
        toast({
          title: 'No Data',
          description: 'No stock data found for the selected filters.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate stock report.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Calculate Grand Total
  const calculateGrandTotal = () => {
    if (!reportData || reportData.itemGroups.length === 0) return null;

    return reportData.itemGroups.reduce(
      (acc, group) => ({
        totalInvQty: acc.totalInvQty + group.totals.totalInvQty,
        totalOutQty: acc.totalOutQty + group.totals.totalOutQty,
        totalBalQty: acc.totalBalQty + group.totals.totalBalQty,
        totalInvWeight: acc.totalInvWeight + group.totals.totalInvWeight,
        totalOutWeight: acc.totalOutWeight + group.totals.totalOutWeight,
        totalBalWeight: acc.totalBalWeight + group.totals.totalBalWeight,
      }),
      {
        totalInvQty: 0,
        totalOutQty: 0,
        totalBalQty: 0,
        totalInvWeight: 0,
        totalOutWeight: 0,
        totalBalWeight: 0,
      }
    );
  };

  const shouldShowGrandTotal = () => {
    return !selectedClient && !selectedItem;
  };

  return (
    <div className="space-y-6">

      {/* Filter Card - hidden on print */}
      <Card className="w-full no-print">
        <CardHeader>
          <CardTitle>Stock Report Item Wise</CardTitle>
          <CardDescription>
            Select filters to generate item-wise stock report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Selection */}
          <div className="customer-selection space-y-2">
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
              {showClientSuggestions && filteredClients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredClients.map((client, index) => (
                    <div
                      key={client.id}
                      className={`px-4 py-2 cursor-pointer ${
                        index === clientHighlightIndex ? 'bg-sky-100' : 'hover:bg-gray-100'
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

          {/* Report Type */}
          <div className="report-type space-y-2">
            <Label>Which Report</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reportType"
                  value="bal"
                  checked={reportType === 'bal'}
                  onChange={() => {
                    setReportType('bal');
                    setReportData(null);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Bal Qty</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reportType"
                  value="all"
                  checked={reportType === 'all'}
                  onChange={() => {
                    setReportType('all');
                    setReportData(null);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">All Qty</span>
              </label>
            </div>
          </div>

          {/* Item Selection */}
          <div className="item-selection space-y-2">
            <Label htmlFor="item">Item Description</Label>
            <div className="relative">
              <Input
                id="item"
                type="text"
                value={itemInput}
                onChange={(e) => handleItemInputChange(e.target.value)}
                onKeyDown={handleItemKeyDown}
                placeholder="Search item (optional - leave blank for all items)"
                className="w-full"
              />
              {showItemSuggestions && filteredItems.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredItems.map((item, index) => (
                    <div
                      key={item}
                      className={`px-4 py-2 cursor-pointer ${
                        index === itemHighlightIndex ? 'bg-sky-100' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleItemSelect(item)}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedItem && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedItem}
              </p>
            )}
          </div>

          {/* As On Date */}
          <div className="as-on-date space-y-2">
            <Label htmlFor="asOnDate">As On Date</Label>
            <Input
              id="asOnDate"
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="action-buttons flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              onClick={handleShowReport}
              disabled={loading}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Show Report
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!reportData}
              className="w-full sm:w-auto min-w-[140px]"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Table - web view */}
      {reportData && reportData.itemGroups.length > 0 && (
        <Card className="w-full mt-8 no-print">
          <CardContent className="p-0">
            <div className="text-center mb-4">
              <p className="text-sm font-semibold">STOCK REPORT ITEM WISE ({reportType === 'bal' ? 'BAL QTY' : 'ALL QTY'}) AS ON DATE : {formatDate(reportData.asOnDate)}</p>
              <p className="text-xs">CUSTOMER NAME : {reportData.customerName || 'ALL CUSTOMERS'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-xs" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-slate-200 font-bold text-center">
                    <th style={{ width: '70px' }} className="border border-black px-2 py-2 text-left">Inv No</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-left">Inv Date</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-left">Brand</th>
                    <th style={{ width: '70px' }} className="border border-black px-2 py-2 text-left">Batch #</th>
                    <th style={{ width: '55px' }} className="border border-black px-2 py-2 text-right">Inv Qty</th>
                    <th style={{ width: '55px' }} className="border border-black px-2 py-2 text-right">Out Qty</th>
                    <th style={{ width: '55px' }} className="border border-black px-2 py-2 text-right">Bal Qty</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-right">Inv Weight</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-right">Out Weight</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-right">Bal Weight</th>
                    <th style={{ width: '50px' }} className="border border-black px-2 py-2 text-right">Bal Days</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.itemGroups.map((group: StockReportItemGroup, groupIndex: number) => (
                    <React.Fragment key={group.itemName}>
                      {/* Item Header Row */}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={11} className="border border-black px-2 py-2 text-center uppercase tracking-wide">
                          {group.itemName}
                        </td>
                      </tr>

                      {/* Data Rows */}
                      {group.rows.map((row: StockReportItemRow, rowIndex: number) => (
                        <tr key={`${row.invNo}-${rowIndex}`}>
                          <td className="border border-black px-2 py-1 text-left whitespace-nowrap">{row.invNo}</td>
                          <td className="border border-black px-2 py-1 text-left whitespace-nowrap">{formatDate(row.invDate)}</td>
                          <td className="border border-black px-2 py-1 text-left whitespace-nowrap">{row.brand}</td>
                          <td className="border border-black px-2 py-1 text-left whitespace-nowrap">{row.batchNumber}</td>
                          <td className="border border-black px-2 py-1 text-right whitespace-nowrap">{row.invQty}</td>
                          <td className="border border-black px-2 py-1 text-right whitespace-nowrap">{row.outQty}</td>
                          <td className="border border-black px-2 py-1 text-right whitespace-nowrap">{row.balQty}</td>
                          <td className="border border-black px-2 py-1 text-right whitespace-nowrap">{row.invWeight.toFixed(2)}</td>
                          <td className="border border-black px-2 py-1 text-right whitespace-nowrap">{row.outWeight.toFixed(2)}</td>
                          <td className="border border-black px-2 py-1 text-right whitespace-nowrap">{row.balWeight.toFixed(2)}</td>
                          <td className="border border-black px-2 py-1 text-right whitespace-nowrap">{row.balDay}</td>
                        </tr>
                      ))}

                      {/* TOTAL Row */}
                      <tr className="bg-slate-200 font-bold">
                        <td colSpan={4} className="border border-black px-2 py-2 text-right">TOTAL</td>
                        <td className="border border-black px-2 py-2 text-right">{group.totals.totalInvQty}</td>
                        <td className="border border-black px-2 py-2 text-right">{group.totals.totalOutQty}</td>
                        <td className="border border-black px-2 py-2 text-right">{group.totals.totalBalQty}</td>
                        <td className="border border-black px-2 py-2 text-right">{group.totals.totalInvWeight.toFixed(2)}</td>
                        <td className="border border-black px-2 py-2 text-right">{group.totals.totalOutWeight.toFixed(2)}</td>
                        <td className="border border-black px-2 py-2 text-right">{group.totals.totalBalWeight.toFixed(2)}</td>
                        <td className="border border-black px-2 py-2 text-right"></td>
                      </tr>
                    </React.Fragment>
                  ))}

                  {/* GRAND TOTAL Row */}
                  {shouldShowGrandTotal() && (() => {
                    const grandTotal = calculateGrandTotal();
                    if (!grandTotal) return null;
                    return (
                      <tr className="bg-slate-300 font-bold">
                        <td colSpan={4} className="border border-black px-2 py-2 text-right">GRAND TOTAL</td>
                        <td className="border border-black px-2 py-2 text-right">{grandTotal.totalInvQty}</td>
                        <td className="border border-black px-2 py-2 text-right">{grandTotal.totalOutQty}</td>
                        <td className="border border-black px-2 py-2 text-right">{grandTotal.totalBalQty}</td>
                        <td className="border border-black px-2 py-2 text-right">{grandTotal.totalInvWeight.toFixed(2)}</td>
                        <td className="border border-black px-2 py-2 text-right">{grandTotal.totalOutWeight.toFixed(2)}</td>
                        <td className="border border-black px-2 py-2 text-right">{grandTotal.totalBalWeight.toFixed(2)}</td>
                        <td className="border border-black px-2 py-2 text-right"></td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Table - print only */}
      {reportData && reportData.itemGroups.length > 0 && (
        <div className="mt-8 print-only hidden">
          {/* Report Header */}
          <PrintHeader
            documentTitle={`STOCK REPORT ITEM WISE (${reportType === 'bal' ? 'BAL QTY' : 'ALL QTY'})`}
            documentDate={formatDate(reportData.asOnDate)}
            additionalInfo={
              <div className="text-center mt-2">
                <span className="text-xs font-bold">CUSTOMER: {reportData.customerName || 'ALL CUSTOMERS'}</span>
              </div>
            }
          />

          {/* Continuous Table */}
          <table className="w-full border-collapse border border-black text-[10px]" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-slate-200 font-bold text-center">
                <th style={{ width: '70px' }} className="border border-black px-1 py-1 text-left">Inv No</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-left">Inv Date</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-left">Brand</th>
                <th style={{ width: '70px' }} className="border border-black px-1 py-1 text-left">Batch #</th>
                <th style={{ width: '55px' }} className="border border-black px-1 py-1 text-right">Inv Qty</th>
                <th style={{ width: '55px' }} className="border border-black px-1 py-1 text-right">Out Qty</th>
                <th style={{ width: '55px' }} className="border border-black px-1 py-1 text-right">Bal Qty</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-right">Inv Weight</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-right">Out Weight</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-right">Bal Weight</th>
                <th style={{ width: '50px' }} className="border border-black px-1 py-1 text-right">Bal Days</th>
              </tr>
            </thead>
            <tbody>
              {reportData.itemGroups.map((group: StockReportItemGroup, groupIndex: number) => (
                <React.Fragment key={group.itemName}>
                  {/* Item Header Row */}
                  <tr className="bg-slate-100 font-bold item-header-row">
                    <td colSpan={11} className="border border-black px-2 py-2 text-center uppercase tracking-wide">
                      {group.itemName}
                    </td>
                  </tr>

                  {/* Data Rows */}
                  {group.rows.map((row: StockReportItemRow, rowIndex: number) => (
                    <tr key={`${row.invNo}-${rowIndex}`}>
                      <td className="border border-black px-1 py-1 text-left whitespace-nowrap">{row.invNo}</td>
                      <td className="border border-black px-1 py-1 text-left whitespace-nowrap">{formatDate(row.invDate)}</td>
                      <td className="border border-black px-1 py-1 text-left whitespace-nowrap">{row.brand}</td>
                      <td className="border border-black px-1 py-1 text-left whitespace-nowrap">{row.batchNumber}</td>
                      <td className="border border-black px-1 py-1 text-right whitespace-nowrap">{row.invQty}</td>
                      <td className="border border-black px-1 py-1 text-right whitespace-nowrap">{row.outQty}</td>
                      <td className="border border-black px-1 py-1 text-right whitespace-nowrap">{row.balQty}</td>
                      <td className="border border-black px-1 py-1 text-right whitespace-nowrap">{row.invWeight.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1 text-right whitespace-nowrap">{row.outWeight.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1 text-right whitespace-nowrap">{row.balWeight.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1 text-right whitespace-nowrap">{row.balDay}</td>
                    </tr>
                  ))}

                  {/* TOTAL Row */}
                  <tr className="bg-slate-200 font-bold total-row">
                    <td colSpan={4} className="border border-black px-1 py-1 text-right">TOTAL</td>
                    <td className="border border-black px-1 py-1 text-right">{group.totals.totalInvQty}</td>
                    <td className="border border-black px-1 py-1 text-right">{group.totals.totalOutQty}</td>
                    <td className="border border-black px-1 py-1 text-right">{group.totals.totalBalQty}</td>
                    <td className="border border-black px-1 py-1 text-right">{group.totals.totalInvWeight.toFixed(2)}</td>
                    <td className="border border-black px-1 py-1 text-right">{group.totals.totalOutWeight.toFixed(2)}</td>
                    <td className="border border-black px-1 py-1 text-right">{group.totals.totalBalWeight.toFixed(2)}</td>
                    <td className="border border-black px-1 py-1 text-right"></td>
                  </tr>
                </React.Fragment>
              ))}

              {/* GRAND TOTAL Row */}
              {shouldShowGrandTotal() && (() => {
                const grandTotal = calculateGrandTotal();
                if (!grandTotal) return null;
                return (
                  <tr className="bg-slate-300 font-bold grand-total-row">
                    <td colSpan={4} className="border border-black px-1 py-1 text-right">GRAND TOTAL</td>
                    <td className="border border-black px-1 py-1 text-right">{grandTotal.totalInvQty}</td>
                    <td className="border border-black px-1 py-1 text-right">{grandTotal.totalOutQty}</td>
                    <td className="border border-black px-1 py-1 text-right">{grandTotal.totalBalQty}</td>
                    <td className="border border-black px-1 py-1 text-right">{grandTotal.totalInvWeight.toFixed(2)}</td>
                    <td className="border border-black px-1 py-1 text-right">{grandTotal.totalOutWeight.toFixed(2)}</td>
                    <td className="border border-black px-1 py-1 text-right">{grandTotal.totalBalWeight.toFixed(2)}</td>
                    <td className="border border-black px-1 py-1 text-right"></td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {reportData && reportData.itemGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center no-print">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No stock data found.</p>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide back button header */
          div[class*="sticky top-0"] {
            display: none !important;
          }
          /* Hide page title */
          .space-y-6 > div:first-child {
            display: none !important;
          }
          /* Hide filter card and empty state */
          .no-print {
            display: none !important;
          }
          /* Show report table on print */
          .print-only {
            display: block !important;
          }
          .print-only.hidden {
            display: block !important;
          }
          /* Remove card styling for print */
          .card, [class*="Card"] {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          /* Remove card content padding */
          [class*="CardContent"] {
            padding: 0 !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-size: 10px;
          }
          /* Table print styles */
          table {
            page-break-inside: auto;
            border-collapse: collapse !important;
          }
          thead {
            display: table-header-group;
          }
          /* Avoid breaking item header from first row */
          .item-header-row {
            page-break-after: avoid;
          }
          /* Avoid breaking TOTAL row */
          .total-row {
            page-break-inside: avoid;
          }
          /* Avoid breaking GRAND TOTAL row */
          .grand-total-row {
            page-break-inside: avoid;
          }
          /* Avoid breaking data rows */
          tbody tr {
            page-break-inside: avoid;
          }
          /* Compact print header */
          .print-header {
            margin-bottom: 8px !important;
          }
          @page {
            size: landscape;
            margin: 0.3cm;
          }
        }
      `}</style>
    </div>
  );
}
