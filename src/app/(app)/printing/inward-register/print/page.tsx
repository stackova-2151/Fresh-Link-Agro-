'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

import { clients } from '@/lib/data';
import { loadInwardVouchers } from '@/lib/voucher-storage';
import type { Client } from '@/lib/types';
import type { InwardVoucher } from '@/components/inventory/bulk-inward-entry-form';

type RegisterRow = {
  inwardNo: string;
  inwardDate: string;
  customerName: string;
  itemDescription: string;
  brand: string;
  inwardQty: number;
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

export default function InwardRegisterPrintPage() {
  const searchParams = useSearchParams();

  const customerId = isoOrEmpty(searchParams.get('customerId'));
  const from = isoOrEmpty(searchParams.get('from'));
  const to = isoOrEmpty(searchParams.get('to'));

  const [vouchers, setVouchers] = useState<InwardVoucher[]>([]);

  useEffect(() => {
    setVouchers(loadInwardVouchers());
  }, []);

  const selectedClient: Client | null = useMemo(() => {
    if (!customerId) return null;
    return clients.find((c) => c.id === customerId) ?? null;
  }, [customerId]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (customerId && v.clientId !== customerId) return false;
      if (!isWithinRange(v.date, from, to)) return false;
      return true;
    });
  }, [customerId, from, to, vouchers]);

  const rows: RegisterRow[] = useMemo(() => {
    return filteredVouchers.flatMap((voucher) => {
      return voucher.items.map((item) => {
        const inwardQty = parseNumberOrZero(item.bags);
        const inwardWeight = parseNumberOrZero(item.totalWeight);

        return {
          inwardNo: voucher.inwardNo,
          inwardDate: voucher.date,
          customerName: voucher.clientName,
          itemDescription: item.itemName,
          brand: item.brand,
          inwardQty,
          inwardWeight,
          driverName: voucher.driverName,
          vehicleNo: voucher.vehicleNo,
        };
      });
    });
  }, [filteredVouchers]);

  const totals = useMemo(() => {
    const totalQty = rows.reduce((sum, r) => sum + r.inwardQty, 0);
    const totalWeight = rows.reduce((sum, r) => sum + r.inwardWeight, 0);
    return { totalQty, totalWeight };
  }, [rows]);

  useEffect(() => {
    if (vouchers.length === 0) return;
    const t = window.setTimeout(() => window.print(), 50);
    return () => window.clearTimeout(t);
  }, [vouchers.length]);

  const headerFromTo = useMemo(() => {
    const fromText = from ? format(new Date(from), 'dd.MM.yyyy') : 'ALL';
    const toText = to ? format(new Date(to), 'dd.MM.yyyy') : 'ALL';
    return { fromText, toText };
  }, [from, to]);

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto bg-white p-8 border shadow-sm print:shadow-none print:border-none">
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <div className="text-2xl font-bold font-headline text-slate-800 uppercase leading-tight">
            FRESH LINK AGRO COLD STORAGE PVT. LTD.
          </div>
          <div className="mt-2 text-sm font-bold uppercase tracking-widest">INWARD REGISTER</div>
          <div className="mt-2 text-xs">
            FROM DATE : {headerFromTo.fromText} &nbsp; TO &nbsp; {headerFromTo.toText}
          </div>
          {selectedClient ? (
            <div className="mt-1 text-xs">CUSTOMER : {selectedClient.name}</div>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center">No inward entries found for selected filters.</div>
        ) : (
          <div className="border-2 border-slate-800 overflow-hidden">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-800">
                  <th className="border-r border-slate-800 p-2 w-[90px]">Inw No</th>
                  <th className="border-r border-slate-800 p-2 w-[100px]">Inw Date</th>
                  <th className="border-r border-slate-800 p-2">Customer Name</th>
                  <th className="border-r border-slate-800 p-2">Item Description</th>
                  <th className="border-r border-slate-800 p-2 w-[120px]">Brand</th>
                  <th className="border-r border-slate-800 p-2 w-[70px]">Inw Qty</th>
                  <th className="border-r border-slate-800 p-2 w-[90px]">Inw Weight</th>
                  <th className="border-r border-slate-800 p-2 w-[130px]">Driver Name</th>
                  <th className="p-2 w-[120px]">Vehicle No</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.inwardNo}:${idx}`} className="border-b border-slate-300 last:border-b-0">
                    <td className="border-r border-slate-800 p-2 font-mono">{r.inwardNo}</td>
                    <td className="border-r border-slate-800 p-2">{format(new Date(r.inwardDate), 'dd.MM.yyyy')}</td>
                    <td className="border-r border-slate-800 p-2 uppercase">{r.customerName}</td>
                    <td className="border-r border-slate-800 p-2 uppercase">{r.itemDescription}</td>
                    <td className="border-r border-slate-800 p-2 uppercase">{r.brand || '-'}</td>
                    <td className="border-r border-slate-800 p-2 text-right font-mono">{r.inwardQty}</td>
                    <td className="border-r border-slate-800 p-2 text-right font-mono">{r.inwardWeight.toFixed(2)}</td>
                    <td className="border-r border-slate-800 p-2 uppercase">{r.driverName || ''}</td>
                    <td className="p-2 uppercase font-mono">{r.vehicleNo || ''}</td>
                  </tr>
                ))}

                <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold">
                  <td colSpan={5} className="border-r border-slate-800 p-2 text-right uppercase">Total</td>
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
          .print\\:hidden { display: none !important; }
          header, footer, nav, aside { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .card { border: none !important; box-shadow: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
