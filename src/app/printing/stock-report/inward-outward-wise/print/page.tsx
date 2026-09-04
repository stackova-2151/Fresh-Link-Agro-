'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { generateInwardOutwardWiseStockReport } from '@/lib/services/stock-report.service';
import { clientsService } from '@/lib/firestore';
import type { Client } from '@/lib/types';
import type { StockReportInwardOutwardWiseData } from '@/lib/types/stock-report';

function isoOrEmpty(value: string | null) {
  const v = (value ?? '').trim();
  return v.length ? v : '';
}

function InwardOutwardWisePrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const customerId = isoOrEmpty(searchParams.get('customerId'));
  const fromDate = isoOrEmpty(searchParams.get('fromDate'));
  const toDate = isoOrEmpty(searchParams.get('toDate'));
  const itemName = isoOrEmpty(searchParams.get('itemName'));

  const [reportData, setReportData] = useState<StockReportInwardOutwardWiseData | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!customerId || !fromDate || !toDate) {
        setError('Missing required parameters');
        setLoaded(true);
        return;
      }

      try {
        // Load client
        const clients = await clientsService.getAll();
        const client = clients.find(c => c.id === customerId);
        if (!client) {
          setError('Client not found');
          setLoaded(true);
          return;
        }
        setSelectedClient(client);

        // Generate report
        const data = await generateInwardOutwardWiseStockReport({
          customerId,
          fromDate,
          toDate,
          itemName: itemName || undefined
        });
        setReportData(data);
        setLoaded(true);
      } catch (err) {
        console.error('Error loading report:', err);
        setError('Failed to load report');
        setLoaded(true);
      }
    };

    loadData();
  }, [customerId, fromDate, toDate, itemName]);

  useEffect(() => {
    if (loaded && reportData && !error) {
      // Auto-print after a short delay
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loaded, reportData, error]);

  if (error) {
    return <div className="p-8 text-center text-red-500 print:hidden">Error: {error}</div>;
  }

  if (!reportData || !loaded) {
    return <div className="p-8 text-center text-muted-foreground print:hidden">Loading report...</div>;
  }

  return (
    <div className="bg-white p-4 print:p-0 print:h-auto print:min-h-0">
      <div className="w-full max-w-[1000px] mx-auto print:max-w-none print:h-auto print:min-h-0">
        {/* Compact Header */}
        <div className="text-center mb-3 print:mb-2">
          <h1 className="text-base font-bold uppercase tracking-wide">FRESH LINK AGRO COLD STORAGE</h1>
          <h2 className="text-sm font-semibold mt-1">INWARD / OUTWARD REPORT</h2>
        </div>

        {/* Compact Info Layout */}
        <div className="mb-3 print:mb-2 text-xs">
          <div className="flex justify-between">
            <span className="font-semibold">Customer Name : <span className="font-normal">{reportData.customerName}</span></span>
            <span className="font-semibold">Date Range : <span className="font-normal">{format(new Date(reportData.fromDate), 'dd.MM.yyyy')} to {format(new Date(reportData.toDate), 'dd.MM.yyyy')}</span></span>
          </div>
          {reportData.selectedItemName && (
            <div className="mt-1">
              <span className="font-semibold">Item Name : <span className="font-normal">{reportData.selectedItemName}</span></span>
            </div>
          )}
        </div>

        {/* Report Table */}
        {reportData.rows.length === 0 ? (
          <div className="p-8 text-center text-sm">No transactions found for selected criteria.</div>
        ) : (
          <table className="w-full text-xs border-collapse border-2 border-black print-table">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="border-r border-black p-1 text-left font-semibold">INW #</th>
                <th className="border-r border-black p-1 text-left font-semibold">INW DATE</th>
                <th className="border-r border-black p-1 text-left font-semibold">ITEM</th>
                <th className="border-r border-black p-1 text-left font-semibold">BRAND</th>
                <th className="border-r border-black p-1 text-right font-semibold">INW QTY</th>
                <th className="border-r border-black p-1 text-right font-semibold">INW WT</th>
                <th className="border-r border-black p-1 text-left font-semibold">OUT #</th>
                <th className="border-r border-black p-1 text-left font-semibold">OUT DATE</th>
                <th className="border-r border-black p-1 text-right font-semibold">OUT QTY</th>
                <th className="border-r border-black p-1 text-right font-semibold">OUT WT</th>
                <th className="border-r border-black p-1 text-right font-semibold">BAL QTY</th>
                <th className="p-1 text-right font-semibold">BAL WT</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let currentItemKey = '';
                return reportData.rows.map((row, index) => {
                  const itemKey = `${row.inwardNo}-${row.itemName}-${row.brand}-${row.batch}`;
                  const isFirstRowOfItem = itemKey !== currentItemKey;
                  currentItemKey = itemKey;

                  return (
                    <tr
                      key={index}
                      className={`border-b border-black ${
                        row.rowType === 'INWARD' ? 'font-semibold' : ''
                      }`}
                    >
                      <td className="border-r border-black p-1 font-mono">{isFirstRowOfItem ? row.inwardNo : ''}</td>
                      <td className="border-r border-black p-1">{isFirstRowOfItem && row.inwardDate ? format(new Date(row.inwardDate), 'dd.MM.yyyy') : ''}</td>
                      <td className="border-r border-black p-1 uppercase">{isFirstRowOfItem ? row.itemName : ''}</td>
                      <td className="border-r border-black p-1">{isFirstRowOfItem ? row.brand : ''}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{row.inwardQty !== undefined ? row.inwardQty : ''}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{row.inwardWeight !== undefined ? row.inwardWeight.toFixed(2) : ''}</td>
                      <td className="border-r border-black p-1 font-mono">{row.outwardNo ?? ''}</td>
                      <td className="border-r border-black p-1">{row.outwardDate ? format(new Date(row.outwardDate), 'dd.MM.yyyy') : ''}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{row.outwardQty !== undefined ? row.outwardQty : ''}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{row.outwardWeight !== undefined ? row.outwardWeight.toFixed(2) : ''}</td>
                      <td className="border-r border-black p-1 text-right font-mono font-semibold">{row.balanceQty.toFixed(2)}</td>
                      <td className="p-1 text-right font-mono font-semibold">{row.balanceWeight.toFixed(2)}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}

        {/* Totals Summary
        {reportData.rows.length > 0 && (
          <div className="mt-4 text-sm border-t border-black pt-2">
            <div className="flex justify-between">
              <span className="font-semibold">Total Inward Qty : <span className="font-normal">{reportData.totalInwardQty}</span></span>
              <span className="font-semibold">Total Inward Weight : <span className="font-normal">{reportData.totalInwardWeight.toFixed(2)} KG</span></span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Outward Qty : <span className="font-normal">{reportData.totalOutwardQty}</span></span>
              <span className="font-semibold">Total Outward Weight : <span className="font-normal">{reportData.totalOutwardWeight.toFixed(2)} KG</span></span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Current Balance Qty : <span className="font-normal">{reportData.totalBalanceQty}</span></span>
              <span className="font-semibold">Current Balance Weight : <span className="font-normal">{reportData.totalBalanceWeight.toFixed(2)} KG</span></span>
            </div>
          </div>
        )} */}
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          header, footer, nav, aside { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            min-height: 0 !important;
          }

          .print-table thead {
            display: table-header-group;
          }

          .print-table tr {
            break-inside: avoid;
          }

          .print-table td,
          .print-table th {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default function InwardOutwardWisePrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground print:hidden">Loading report...</div>}>
      <InwardOutwardWisePrintContent />
    </Suspense>
  );
}
