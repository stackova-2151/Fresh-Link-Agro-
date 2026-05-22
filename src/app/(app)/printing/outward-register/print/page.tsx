'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { clientsService } from '@/lib/firestore';
import type { Client } from '@/lib/types';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';

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
    if (!loaded || vouchers.length === 0) return;
    const t = window.setTimeout(() => window.print(), 50);
    return () => window.clearTimeout(t);
  }, [loaded, vouchers.length]);

  const headerFromTo = useMemo(() => ({
    fromText: from ? format(new Date(from), 'dd.MM.yyyy') : 'ALL',
    toText: to ? format(new Date(to), 'dd.MM.yyyy') : 'ALL',
  }), [from, to]);

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">Loading register...</div>;

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto bg-white p-8 border shadow-sm print:shadow-none print:border-none">
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <div className="text-2xl font-bold font-headline text-slate-800 uppercase leading-tight">
            FRESH LINK AGRO COLD STORAGE PVT. LTD.
          </div>
          <div className="mt-2 text-sm font-bold uppercase tracking-widest">OUTWARD REGISTER</div>
          <div className="mt-2 text-xs">
            FROM DATE : {headerFromTo.fromText} &nbsp; TO &nbsp; {headerFromTo.toText}
          </div>
          {selectedClient && <div className="mt-1 text-xs">CUSTOMER : {selectedClient.name}</div>}
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center">No outward entries found for selected filters.</div>
        ) : (
          <div className="border-2 border-slate-800 overflow-hidden">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-800">
                  <th className="border-r border-slate-800 p-2 w-[90px]">OutNo</th>
                  <th className="border-r border-slate-800 p-2 w-[100px]">Out Date</th>
                  <th className="border-r border-slate-800 p-2">Customer Name</th>
                  <th className="border-r border-slate-800 p-2 w-[90px]">InwNo</th>
                  <th className="border-r border-slate-800 p-2">Item Description</th>
                  <th className="border-r border-slate-800 p-2 w-[120px]">Brand</th>
                  <th className="border-r border-slate-800 p-2 w-[70px]">OutQty</th>
                  <th className="border-r border-slate-800 p-2 w-[90px]">OutWt</th>
                  <th className="border-r border-slate-800 p-2 w-[130px]">Driver Name</th>
                  <th className="p-2 w-[120px]">Vehicle No</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.outwardNo}:${idx}`} className="border-b border-slate-300 last:border-b-0">
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
                  <td colSpan={6} className="border-r border-slate-800 p-2 text-right uppercase">Total</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{totals.totalQty}</td>
                  <td className="border-r border-slate-800 p-2 text-right font-mono">{totals.totalWeight.toFixed(2)}</td>
                  <td className="border-r border-slate-800 p-2" />
                  <td className="p-2" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          header, footer, nav, aside { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          @page { margin: 1.5cm; }
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
