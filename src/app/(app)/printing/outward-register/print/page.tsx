'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { clientsService } from '@/lib/firestore';
import type { Client } from '@/lib/types';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';
import { PrintHeader } from '@/components/print/PrintHeader';

type RegisterRow = {
  outwardNo: string;
  outDate: string;
  customerName: string;
  inwardNo: string;
  itemDescription: string;
  brand: string;
  outQty: number;
  outWeight: number;
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

function OutwardRegisterPrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const customerId = isoOrEmpty(searchParams.get('customerId'));
  const from = isoOrEmpty(searchParams.get('from'));
  const to = isoOrEmpty(searchParams.get('to'));

  const [vouchers, setVouchers] = useState<OutwardVoucher[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let q = query(collection(db, 'outwardVouchers'), orderBy('date', 'asc'));
        if (customerId) {
          q = query(collection(db, 'outwardVouchers'), where('clientId', '==', customerId), orderBy('date', 'asc'));
        }

        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
        setVouchers(data);

        if (customerId) {
          const c = await clientsService.getById(customerId);
          setSelectedClient(c);
        }
      } catch (err) {
        console.error('Failed to load outward vouchers:', err);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [customerId]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => isWithinRange(v.date, from, to));
  }, [vouchers, from, to]);

  const rows: RegisterRow[] = useMemo(() => {
    return filteredVouchers.flatMap((voucher) =>
      voucher.items.map((item) => ({
        outwardNo: voucher.outwardNo,
        outDate: voucher.date,
        customerName: voucher.clientName,
        inwardNo: item.inwardNumber,
        itemDescription: item.itemName,
        brand: item.brand,
        outQty: parseNumberOrZero(item.bags),
        outWeight: parseNumberOrZero(item.totalWeight),
        driverName: voucher.driverName,
        vehicleNo: voucher.vehicleNo,
      }))
    );
  }, [filteredVouchers]);

  const totals = useMemo(() => ({
    totalQty: rows.reduce((sum, r) => sum + r.outQty, 0),
    totalWeight: rows.reduce((sum, r) => sum + r.outWeight, 0),
  }), [rows]);

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

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">Loading register...</div>;

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
      <div className="w-full max-w-[1400px] mx-auto bg-white p-4 print:p-2 border shadow-sm print:shadow-none print:border-none">
        <PrintHeader
          documentTitle="OUTWARD REGISTER"
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
          <div className="p-8 text-center">No outward entries found for selected filters.</div>
        ) : (
          <table className="w-full text-[11px] border-collapse border-2 border-slate-800 print-table">
            <thead className="bg-slate-50">
              <tr className="border-b-2 border-slate-800">
                <th className="border-r border-slate-800 p-2">Out No</th>
                <th className="border-r border-slate-800 p-2">Out Date</th>
                <th className="border-r border-slate-800 p-2">Customer Name</th>
                <th className="border-r border-slate-800 p-2">Inw No</th>
                <th className="border-r border-slate-800 p-2">Item Description</th>
                <th className="border-r border-slate-800 p-2">Brand</th>
                <th className="border-r border-slate-800 p-2">Out Qty</th>
                <th className="border-r border-slate-800 p-2">Out Weight</th>
                <th className="border-r border-slate-800 p-2">Driver Name</th>
                <th className="p-2">Vehicle No</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.outwardNo}:${idx}`} className="border-b border-slate-500">
                  <td className="border-r border-slate-800 p-2 font-mono">{r.outwardNo}</td>
                  <td className="border-r border-slate-800 p-2">{format(new Date(r.outDate), 'dd.MM.yyyy')}</td>
                  <td className="border-r border-slate-800 p-2 uppercase">{r.customerName}</td>
                  <td className="border-r border-slate-800 p-2 font-mono">{r.inwardNo}</td>
                  <td className="border-r border-slate-800 p-2 uppercase">{r.itemDescription}</td>
                  <td className="border-r border-slate-800 p-2 uppercase">{r.brand || '-'}</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{r.outQty}</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{r.outWeight.toFixed(2)}</td>
                  <td className="border-r border-slate-800 p-2 uppercase">{r.driverName || ''}</td>
                  <td className="p-2 uppercase font-mono">{r.vehicleNo || ''}</td>
                </tr>
              ))}
             <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold">
                <td className="text-right uppercase">Total</td>
                <td className=""/>
                <td className="" />
                <td className="" />
                <td className="" />
                <td className="border-r border-slate-800 p-2" />
                <td className="border-r border-slate-800 p-2 text-right font-mono">{totals.totalQty}</td>
                <td className="border-r border-slate-800 p-2 text-right font-mono">{totals.totalWeight.toFixed(2)}</td>
                <td className="border-r border-slate-800 p-2" />
                <td className="p-2" />
              </tr>
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
        }
      `}</style>
    </div>
  );
}

export default function OutwardRegisterPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading register...</div>}>
      <OutwardRegisterPrintContent />
    </Suspense>
  );
}
