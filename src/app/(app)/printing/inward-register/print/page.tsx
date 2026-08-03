'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { clientsService } from '@/lib/firestore';
import type { Client } from '@/lib/types';
import type { InwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';
import { PrintHeader } from '@/components/print/PrintHeader';

type RegisterRow = {
  inwardNo: string;
  inwardDate: string;
  customerName: string;
  itemDescription: string;
  brand: string;
  inwardQty: number;
  unit: string;
  inwardWeight: number;
  driverName: string;
  vehicleNo: string;
};

function isoOrEmpty(value: string | null) {
  const v = (value ?? '').trim();
  return v.length ? v : '';
}

function isWithinRange(dateIso: string, fromIso: string, toIso: string) {
  if (!fromIso && !toIso) return true;
  if (fromIso && dateIso < fromIso) return false;
  if (toIso && dateIso > toIso) return false;
  return true;
}

function parseNumberOrZero(v: unknown) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function isBeforeDate(dateIso: string, beforeDateIso: string) {
  if (!beforeDateIso) return false;
  return dateIso < beforeDateIso;
}

function InwardRegisterPrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const customerId = isoOrEmpty(searchParams.get('customerId'));
  const from = isoOrEmpty(searchParams.get('from'));
  const to = isoOrEmpty(searchParams.get('to'));

  const [vouchers, setVouchers] = useState<InwardVoucher[]>([]);
  const [outwardVouchers, setOutwardVouchers] = useState<OutwardVoucher[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Build Firestore queries for both inward and outward
        let inwardQ = query(collection(db, 'inwardVouchers'), orderBy('date', 'asc'));
        let outwardQ = query(collection(db, 'outwardVouchers'), orderBy('date', 'asc'));

        if (customerId) {
          inwardQ = query(collection(db, 'inwardVouchers'), where('clientId', '==', customerId), orderBy('date', 'asc'));
          outwardQ = query(collection(db, 'outwardVouchers'), where('clientId', '==', customerId), orderBy('date', 'asc'));
        }

        const [inwardSnap, outwardSnap] = await Promise.all([
          getDocs(inwardQ),
          getDocs(outwardQ)
        ]);

        const inwardData = inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));
        const outwardData = outwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));

        setVouchers(inwardData);
        setOutwardVouchers(outwardData);

        if (customerId) {
          const c = await clientsService.getById(customerId);
          setSelectedClient(c);
        }
      } catch (err) {
        console.error('Failed to load vouchers:', err);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [customerId]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => isWithinRange(v.date, from, to));
  }, [vouchers, from, to]);

  const filteredOutwardVouchers = useMemo(() => {
    return outwardVouchers.filter((v) => isWithinRange(v.date, from, to));
  }, [outwardVouchers, from, to]);

  const rows: RegisterRow[] = useMemo(() => {
    return filteredVouchers.flatMap((voucher) =>
      voucher.items.map((item) => ({
        inwardNo: voucher.inwardNo,
        inwardDate: voucher.date,
        customerName: voucher.clientName,
        itemDescription: item.itemName,
        brand: item.brand,
        inwardQty: parseNumberOrZero(item.bags),
        unit: item.unit || '',
        inwardWeight: parseNumberOrZero(item.totalWeight),
        driverName: voucher.driverName,
        vehicleNo: voucher.vehicleNo,
      }))
    );
  }, [filteredVouchers]);

  const totals = useMemo(() => ({
    totalQty: rows.reduce((sum, r) => sum + r.inwardQty, 0),
    totalWeight: rows.reduce((sum, r) => sum + r.inwardWeight, 0),
  }), [rows]);

  // Calculate opening stock (inward before fromDate - outward before fromDate)
  const openingStock = useMemo(() => {
    const openingInwardQty = vouchers
      .filter((v) => isBeforeDate(v.date, from))
      .reduce((sum, v) => sum + v.items.reduce((itemSum, item) => itemSum + parseNumberOrZero(item.bags), 0), 0);

    const openingInwardWeight = vouchers
      .filter((v) => isBeforeDate(v.date, from))
      .reduce((sum, v) => sum + v.items.reduce((itemSum, item) => itemSum + parseNumberOrZero(item.totalWeight), 0), 0);

    const openingOutwardQty = outwardVouchers
      .filter((v) => isBeforeDate(v.date, from))
      .reduce((sum, v) => sum + v.items.reduce((itemSum, item) => itemSum + parseNumberOrZero(item.qty), 0), 0);

    const openingOutwardWeight = outwardVouchers
      .filter((v) => isBeforeDate(v.date, from))
      .reduce((sum, v) => sum + v.items.reduce((itemSum, item) => itemSum + parseNumberOrZero(item.totalWeight), 0), 0);

    return {
      qty: Math.max(0, openingInwardQty - openingOutwardQty),
      weight: Math.max(0, openingInwardWeight - openingOutwardWeight),
    };
  }, [vouchers, outwardVouchers, from]);

  // Calculate total outward in date range
  const totalOutward = useMemo(() => {
    const outwardQty = filteredOutwardVouchers
      .reduce((sum, v) => sum + v.items.reduce((itemSum, item) => itemSum + parseNumberOrZero(item.qty), 0), 0);

    const outwardWeight = filteredOutwardVouchers
      .reduce((sum, v) => sum + v.items.reduce((itemSum, item) => itemSum + parseNumberOrZero(item.totalWeight), 0), 0);

    return {
      qty: outwardQty,
      weight: outwardWeight,
    };
  }, [filteredOutwardVouchers]);

  // Calculate summary (Opening + Inward - Outward)
  const summary = useMemo(() => {
    const balanceQty = openingStock.qty + totals.totalQty - totalOutward.qty;
    const balanceWeight = openingStock.weight + totals.totalWeight - totalOutward.weight;

    return {
      openingStock,
      totalInward: {
        qty: totals.totalQty,
        weight: totals.totalWeight,
      },
      totalOutward,
      totalBalance: {
        qty: Math.max(0, balanceQty),
        weight: Math.max(0, balanceWeight),
      },
    };
  }, [openingStock, totals, totalOutward]);

  useEffect(() => {
    if (!loaded) return;
    if (vouchers.length === 0) return;
    requestAnimationFrame(() => {
      window.print();
    });
  }, [loaded, vouchers.length]);

  // Return to previous page after print dialog closes
  useEffect(() => {
    const handleAfterPrint = () => {
      router.back();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [router]);

  const headerFromTo = useMemo(() => ({
    fromText: from ? format(new Date(from), 'dd.MM.yyyy') : 'ALL',
    toText: to ? format(new Date(to), 'dd.MM.yyyy') : 'ALL',
  }), [from, to]);

  if (!loaded) {
    return <div className="p-8 text-center text-muted-foreground">Loading register...</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
      <div className="w-full max-w-[1400px] mx-auto bg-white p-4 print:p-2 border shadow-sm print:shadow-none print:border-none">
        <PrintHeader
          documentTitle="INWARD REGISTER"
          additionalInfo={
             <div className="flex justify-center items-center gap-20 text-xs mt-3">
             <div className="flex items-center gap-2">
                <span className="font-bold">FROM DATE:</span>
                <span className=" border-slate-300">
                    {headerFromTo.fromText}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold">TO DATE:</span>
                <span className="">
                    {headerFromTo.toText}
                </span>
              </div>
            </div>
          }
        />
        {selectedClient && (
          <div className="text-center mb-4">
            <span className="text-xs font-bold">CUSTOMER: {selectedClient.name}</span>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="p-8 text-center">No inward entries found for selected filters.</div>
        ) : (
          <>
          <table className="w-full text-[11px] border-collapse border-2 border-slate-800 print-table">
            <thead className="bg-slate-50">
              <tr className="border-b-2 border-slate-800">
                <th className="border-r border-slate-800 p-2 ">Inw No</th>
                <th className="border-r border-slate-800 p-2">Inw Date</th>
                <th className="border-r border-slate-800 p-2">Customer Name</th>
                <th className="border-r border-slate-800 p-2">Item Description</th>
                <th className="border-r border-slate-800 p-2">Brand</th>
                <th className="border-r border-slate-800 p-2">Inw Qty</th>
                <th className="border-r border-slate-800 p-2">Unit</th>
                <th className="border-r border-slate-800 p-2">Inw Weight</th>
                <th className="border-r border-slate-800 p-2">Driver Name</th>
                <th className="p-2">Vehicle No</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.inwardNo}:${idx}`} className="border-b border-slate-500">
                  <td className="border-r border-slate-800 p-2 font-mono">{r.inwardNo}</td>
                  <td className="border-r border-slate-800 p-2">{format(new Date(r.inwardDate), 'dd.MM.yyyy')}</td>
                  <td className="border-r border-slate-800 p-2 uppercase">{r.customerName}</td>
                  <td className="border-r border-slate-800 p-2 uppercase">{r.itemDescription}</td>
                  <td className="border-r border-slate-800 p-2 uppercase">{r.brand || '-'}</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{r.inwardQty}</td>
                  <td className="border-r border-slate-800 p-2 text-center uppercase">{r.unit}</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{r.inwardWeight.toFixed(2)}</td>
                  <td className="border-r border-slate-800 p-2 uppercase">{r.driverName || ''}</td>
                  <td className="p-2 uppercase font-mono">{r.vehicleNo || ''}</td>
                </tr>
              ))}
             <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold">
                <td className="text-right uppercase">Total</td>
                <td className=""/>
                <td className="" />
                <td className="" />
                <td className="border-r border-slate-800 p-2" />
                <td className="border-r border-slate-800 p-2 text-right font-mono">{totals.totalQty}</td>
                <td className="border-r border-slate-800 p-2" />
                <td className="border-r border-slate-800 p-2 text-right font-mono">{totals.totalWeight.toFixed(2)}</td>
                <td className="border-r border-slate-800 p-2" />
                <td className="p-2" />
              </tr>
            </tbody>
          </table>

          {/* Summary block: Opening Stock / Total Inward / Total Outward / Total Balance */}
          <div className="summary-block mt-2 flex justify-start">
            <table className="text-[11px] border-collapse border-2 border-slate-700 w-[380px]">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-800">
                  <th className="border-r border-slate-800 p-2 text-left w-[180px]"></th>
                  <th className="border-r border-slate-800 p-2 text-right w-[100px]">Qty</th>
                  <th className="p-2 text-right w-[100px]">Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-500">
                  <td className="border-r border-slate-800 p-2 font-bold uppercase">Opening Stock</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{summary.openingStock.qty}</td>
                  <td className="p-2 text-right font-mono">{summary.openingStock.weight.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-500">
                  <td className="border-r border-slate-800 p-2 font-bold uppercase">Total Inward</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{summary.totalInward.qty}</td>
                  <td className="p-2 text-right font-mono">{summary.totalInward.weight.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-500">
                  <td className="border-r border-slate-800 p-2 font-bold uppercase">Total Outward</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{summary.totalOutward.qty}</td>
                  <td className="p-2 text-right font-mono">{summary.totalOutward.weight.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-500">
                  <td className="border-r border-slate-800 p-2 font-bold uppercase">Total Balance</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{summary.totalBalance.qty}</td>
                  <td className="p-2 text-right font-mono">{summary.totalBalance.weight.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
  </>
        )}
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

          .print-table tr {
            break-inside: avoid;
          }

          .print-table td,
          .print-table th {
            break-inside: avoid;
          }

          .summary-block {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default function InwardRegisterPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading register...</div>}>
      <InwardRegisterPrintContent />
    </Suspense>
  );
}