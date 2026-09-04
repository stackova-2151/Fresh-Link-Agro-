'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { generateInwardWiseStockReport } from '@/lib/services/stock-report.service';
import { clientsService } from '@/lib/firestore';
import type { Client } from '@/lib/types';
import type { StockReportInwardWiseData } from '@/lib/types/stock-report';

function isoOrEmpty(value: string | null) {
  const v = (value ?? '').trim();
  return v.length ? v : '';
}

function InwardWisePrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const customerId = isoOrEmpty(searchParams.get('customerId'));
  const inwardNo = isoOrEmpty(searchParams.get('inwardNo'));
  const itemName = isoOrEmpty(searchParams.get('itemName'));

  const [reportData, setReportData] = useState<StockReportInwardWiseData | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (!customerId || !inwardNo) {
          setError('Missing required parameters');
          setLoaded(true);
          return;
        }

        // Load client
        const client = await clientsService.getById(customerId);
        setSelectedClient(client);

        // Generate report
        const data = await generateInwardWiseStockReport({
          customerId,
          inwardNo,
          itemName: itemName || undefined
        });

        setReportData(data);
      } catch (err) {
        console.error('Failed to load report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [customerId, inwardNo, itemName]);

  useEffect(() => {
    if (!loaded || !reportData || error) return;
    requestAnimationFrame(() => {
      window.print();
    });
  }, [loaded, reportData, error]);

  // Return to previous page after print dialog closes
  useEffect(() => {
    const handleAfterPrint = () => {
      router.back();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [router]);

  if (!loaded) {
    return <div className="p-8 text-center text-muted-foreground print:hidden">Loading report...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 print:hidden">Error: {error}</div>;
  }

  if (!reportData) {
    return <div className="p-8 text-center text-muted-foreground print:hidden">No data found</div>;
  }

  return (
    <div className="bg-white p-4 print:p-0 print:h-auto print:min-h-0">
      <div className="w-full max-w-[1000px] mx-auto print:max-w-none print:h-auto print:min-h-0">
        {/* Compact Header */}
        <div className="text-center mb-4 print:mb-2">
          <h1 className="text-lg font-bold uppercase tracking-wide">FRESH LINK AGRO COLD STORAGE</h1>
          <h2 className="text-sm font-semibold mt-1">Inward Report</h2>
        </div>

        {/* Compact Info Layout */}   
        <div className="mb-4 print:mb-3 text-sm">
          <div className="flex justify-between mb-1">
            <span className="font-semibold">Customer Name : <span className="font-normal">{reportData.customerName}</span></span>
            <span className="font-semibold">Gir No : <span className="font-normal">{reportData.gatePassNo || '-'}</span></span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-semibold">Inward No : <span className="font-normal">{reportData.inwardNo}</span></span>
            <span className="font-semibold">Inward Qty : <span className="font-normal">{reportData.totalInwardQty}</span></span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Inward Date : <span className="font-normal">{reportData.inwardDate ? format(new Date(reportData.inwardDate), 'dd.MM.yyyy') : '-'}</span></span>
            <span className="font-semibold">Inward Weight : <span className="font-normal">{reportData.totalInwardWeight.toFixed(2)} KG</span></span>
          </div>
        </div>

        {/* Report Table */}
        {reportData.rows.length === 0 ? (
          <div className="p-8 text-center text-sm">No transactions found for selected inward.</div>
        ) : (
          <table className="w-full text-xs border-collapse border-2 border-black print-table">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="border-r border-black p-1 text-left font-semibold">Item Name</th>
                <th className="border-r border-black p-1 text-left font-semibold">Out No</th>
                <th className="border-r border-black p-1 text-left font-semibold">Out Date</th>
                <th className="border-r border-black p-1 text-right font-semibold">Out Qty</th>
                <th className="border-r border-black p-1 text-right font-semibold">Out Weight</th>
                <th className="border-r border-black p-1 text-right font-semibold">Bal Qty</th>
                <th className="p-1 text-right font-semibold">Bal Weight</th>
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
                      className={`border-b border-black ${
                        row.rowType === 'INWARD' ? 'font-semibold' : ''
                      }`}
                    >
                      <td className="border-r border-black p-1 uppercase">
                        {isFirstRowOfItem ? row.itemName : ''}
                      </td>
                      <td className="border-r border-black p-1 font-mono">{row.outwardNo || '-'}</td>
                      <td className="border-r border-black p-1">{row.outwardDate ? format(new Date(row.outwardDate), 'dd.MM.yyyy') : '-'}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{row.outwardQty ?? '-'}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{row.outwardWeight ? row.outwardWeight.toFixed(2) : '-'}</td>
                      <td className="border-r border-black p-1 text-right font-mono font-semibold">{row.balanceQty.toFixed(2)}</td>
                      <td className="p-1 text-right font-mono font-semibold">{row.balanceWeight.toFixed(2)}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          header, footer, nav, aside { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
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

export default function InwardWisePrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground print:hidden">Loading report...</div>}>
      <InwardWisePrintContent />
    </Suspense>
  );
}
