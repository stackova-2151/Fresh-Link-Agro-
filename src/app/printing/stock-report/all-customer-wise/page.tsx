'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { clientsService } from '@/lib/firestore';
import { generateStockReport } from '@/lib/services/stock-report.service';
import type { Client } from '@/lib/types';
import type { StockReportData, StockReportCustomerGroup, StockReportRow } from '@/lib/types/stock-report';
import { format } from 'date-fns';
import { PrintHeader } from '@/components/print/PrintHeader';

export default function StockReportAllCustomerWisePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientInput, setClientInput] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  
  const [reportData, setReportData] = useState<StockReportData | null>(null);
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
    setReportData(null);
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

  const handleShowReport = async () => {
    setLoading(true);
    try {
      const data = await generateStockReport(selectedClient?.id);
      setReportData(data);
      
      if (data.customerGroups.length === 0) {
        toast({ 
          title: 'No Data', 
          description: selectedClient 
            ? `No stock data found for ${selectedClient.name}.` 
            : 'No stock data found for any customer.',
          variant: 'destructive' 
        });
      } else {
        // toast({ 
        //   title: 'Success', 
        //   description: `Generated stock report for ${data.customerGroups.length} customer(s).` 
        // });
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

  // Calculate Grand Total from customer totals
  const calculateGrandTotal = () => {
    if (!reportData || reportData.customerGroups.length === 0) return null;

    return reportData.customerGroups.reduce(
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

  return (
    <div className="space-y-6">
      {/* Filter Card - hidden on print */}
      <Card className="w-full no-print">
        <CardHeader>
          <CardTitle>Stock Report All Customer Wise</CardTitle>
          <CardDescription>
            Select a customer or leave blank to generate report for all customers.
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
      {reportData && reportData.customerGroups.length > 0 && (
        <Card className="w-full mt-8 no-print">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-xs" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-slate-200 font-bold text-center">
                    <th style={{ width: '70px' }} className="border border-black px-2 py-2 text-left">Inv No</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-left">Inv Date</th>
                    <th style={{ width: '60px' }} className="border border-black px-2 py-2 text-left">Chamber</th>
                    <th style={{ width: '160px' }} className="border border-black px-2 py-2 text-left">Item Description</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-left">Brand</th>
                    <th style={{ width: '70px' }} className="border border-black px-2 py-2 text-left">Batch #</th>
                    <th style={{ width: '55px' }} className="border border-black px-2 py-2 text-right">Inv Qty</th>
                    <th style={{ width: '55px' }} className="border border-black px-2 py-2 text-right">Out Qty</th>
                    <th style={{ width: '55px' }} className="border border-black px-2 py-2 text-right">Bal Qty</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-right">Inv Weight</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-right">Out Weight</th>
                    <th style={{ width: '80px' }} className="border border-black px-2 py-2 text-right">Bal Weight</th>
                    <th style={{ width: '50px' }} className="border border-black px-2 py-2 text-right">Bal Day</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.customerGroups.map((group: StockReportCustomerGroup, groupIndex: number) => (
                    <React.Fragment key={group.clientId}>
                      {/* Customer Header Row */}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={13} className="border border-black px-2 py-2 text-center uppercase tracking-wide">
                          {group.customerName}
                        </td>
                      </tr>

                      {/* Data Rows */}
                      {group.rows.map((row: StockReportRow, rowIndex: number) => (
                        <tr key={`${row.invNo}-${rowIndex}`}>
                          <td className="border border-black px-2 py-1 text-left whitespace-nowrap">{row.invNo}</td>
                          <td className="border border-black px-2 py-1 text-left whitespace-nowrap">{formatDate(row.invDate)}</td>
                          <td className="border border-black px-2 py-1 text-left whitespace-nowrap">{row.chamberName}</td>
                          <td className="border border-black px-2 py-1 text-left whitespace-nowrap">{row.itemDescription}</td>
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
                        <td>TOTAL</td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
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
                  {(() => {
                    const grandTotal = calculateGrandTotal();
                    if (!grandTotal) return null;
                    return (
                      <tr className="bg-slate-300 font-bold">
                        <td className="border border-black px-2 py-2 text-left">GRAND TOTAL</td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
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
      {reportData && reportData.customerGroups.length > 0 && (
        <div className="mt-8 print-only hidden">
          {/* Report Header */}
          <PrintHeader
            documentTitle="CUSTOMER STOCK REPORT"
            documentDate={formatDate(reportData.reportDate)}
          />

          {/* Continuous Table */}
          <table className="w-full border-collapse border border-black text-[10px]" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-slate-200 font-bold text-center">
                <th style={{ width: '70px' }} className="border border-black px-1 py-1 text-left">Inv No</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-left">Inv Date</th>
                <th style={{ width: '60px' }} className="border border-black px-1 py-1 text-left">Chamber</th>
                <th style={{ width: '160px' }} className="border border-black px-1 py-1 text-left">Item Description</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-left">Brand</th>
                <th style={{ width: '70px' }} className="border border-black px-1 py-1 text-left">Batch #</th>
                <th style={{ width: '55px' }} className="border border-black px-1 py-1 text-right">Inv Qty</th>
                <th style={{ width: '55px' }} className="border border-black px-1 py-1 text-right">Out Qty</th>
                <th style={{ width: '55px' }} className="border border-black px-1 py-1 text-right">Bal Qty</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-right">Inv Weight</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-right">Out Weight</th>
                <th style={{ width: '80px' }} className="border border-black px-1 py-1 text-right">Bal Weight</th>
                <th style={{ width: '50px' }} className="border border-black px-1 py-1 text-right">Bal Day</th>
              </tr>
            </thead>
            <tbody>
              {reportData.customerGroups.map((group: StockReportCustomerGroup, groupIndex: number) => (
                <React.Fragment key={group.clientId}>
                  {/* Customer Header Row */}
                  <tr className="bg-slate-100 font-bold customer-header-row">
                    <td colSpan={13} className="border border-black px-2 py-2 text-center uppercase tracking-wide">
                      {group.customerName}
                    </td>
                  </tr>

                  {/* Data Rows */}
                  {group.rows.map((row: StockReportRow, rowIndex: number) => (
                    <tr key={`${row.invNo}-${rowIndex}`}>
                      <td className="border border-black px-1 py-1 text-left whitespace-nowrap">{row.invNo}</td>
                      <td className="border border-black px-1 py-1 text-left whitespace-nowrap">{formatDate(row.invDate)}</td>
                      <td className="border border-black px-1 py-1 text-left whitespace-nowrap">{row.chamberName}</td>
                      <td className="border border-black px-1 py-1 text-left whitespace-nowrap">{row.itemDescription}</td>
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
                    <td>TOTAL</td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
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
              {(() => {
                const grandTotal = calculateGrandTotal();
                if (!grandTotal) return null;
                return (
                  <tr className="bg-slate-300 font-bold grand-total-row">
                  <td className="border border-black px-1 py-1 text-left">TOTAL</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="border border-black px-1 py-1 text-right">{grandTotal.totalInvQty}</td>
                  <td className="border border-black px-1 py-1 text-right">{grandTotal.totalOutQty}</td>
                  <td className="border border-black px-1 py-1 text-right">{grandTotal.totalBalQty}</td>
                  <td className="border border-black px-1 py-1 text-right">{grandTotal.totalInvWeight.toFixed(2)}</td>
                  <td className="border border-black px-1 py-1 text-right">{grandTotal.totalOutWeight.toFixed(2)}</td>
                  <td className="border border-black px-1 py-1 text-right">{grandTotal.totalBalWeight.toFixed(2)}</td>
                  <td className="border border-black"></td>
                </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {reportData && reportData.customerGroups.length === 0 && (
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
          /* Avoid breaking customer header from first row */
          .customer-header-row {
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
