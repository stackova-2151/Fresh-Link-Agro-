'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

import { clients } from '@/lib/data';
import { loadOutwardVouchers } from '@/lib/voucher-storage';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';

export default function OutwardPrintPage() {
  const params = useParams();
  const outwardNoParam = (params.outwardNo as string | undefined) ?? '';

  const [voucher, setVoucher] = useState<OutwardVoucher | null>(null);

  useEffect(() => {
    const key = decodeURIComponent(outwardNoParam || '').trim().toUpperCase();
    const all = loadOutwardVouchers();
    const found = all.find((v) => v.outwardNo.trim().toUpperCase() === key) ?? null;
    setVoucher(found);
  }, [outwardNoParam]);

  const client = useMemo(() => {
    if (!voucher) return null;
    return clients.find((c) => c.id === voucher.clientId) ?? null;
  }, [voucher]);

  useEffect(() => {
    if (!voucher) return;
    const t = window.setTimeout(() => window.print(), 50);
    return () => window.clearTimeout(t);
  }, [voucher]);

  const totalQty = useMemo(() => {
    if (!voucher) return 0;
    return voucher.items.reduce((sum, r) => sum + (typeof r.bags === 'number' ? r.bags : 0), 0);
  }, [voucher]);

  const totalWeight = useMemo(() => {
    if (!voucher) return 0;
    return voucher.items.reduce((sum, r) => sum + (r.totalWeight || 0), 0);
  }, [voucher]);

  if (!voucher) {
    return <div className="p-8 text-center">Voucher not found: {decodeURIComponent(outwardNoParam || '')}</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto bg-white p-8 border shadow-sm print:shadow-none print:border-none">
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-headline text-slate-800 uppercase leading-tight">FRESH LINK AGRO COLD STORAGE PVT. LTD.</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Address : Gat No.319,Gaud Dara Road,Khed Shivapur,Tal.Haveli,Dist.Pune - 412205
              <br />
              MOBILE NO : 9699833995 / 8530818811 / 9423568775
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="w-12 h-12 relative opacity-50 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-green-600"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
            </div>
            <p className="text-[10px] font-bold text-green-700 uppercase">Fresh Link</p>
          </div>
        </div>

        <div className="text-center mb-6">
          <span className="border-2 border-slate-800 px-10 py-1 font-bold text-sm bg-slate-50 uppercase tracking-widest">Delivery Order</span>
        </div>

        <div className="grid grid-cols-12 gap-y-4 text-xs mb-8">
          <div className="col-span-7 space-y-2 pr-8">
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Customer Name :</span>
              <span className="border-b border-slate-300 flex-1 uppercase">{voucher.clientName}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Address :</span>
              <span className="border-b border-slate-300 flex-1">{client?.address ?? ''}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Remark :</span>
              <span className="border-b border-slate-300 flex-1">{voucher.notes || 'N/A'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Driver Name :</span>
              <span className="border-b border-slate-300 flex-1 uppercase">{voucher.driverName}</span>
            </div>
          </div>

          <div className="col-span-5 space-y-2 pl-4">
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Out No :</span>
              <span className="border-b border-slate-300 flex-1 font-mono font-bold text-sm">{voucher.outwardNo}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Date :</span>
              <span className="border-b border-slate-300 flex-1">{format(new Date(voucher.date), 'dd.MM.yyyy')}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Veh.No. :</span>
              <span className="border-b border-slate-300 flex-1 font-mono uppercase">{voucher.vehicleNo}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Gate Pass No :</span>
              <span className="border-b border-slate-300 flex-1 font-mono">{voucher.gatePassNo}</span>
            </div>
          </div>
        </div>

        <div className="border-2 border-slate-800 mb-20 overflow-hidden">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-800">
                <th className="border-r border-slate-800 p-2 w-[50px]">Sr.No.</th>
                <th className="border-r border-slate-800 p-2 text-left">Item Name</th>
                <th className="border-r border-slate-800 p-2 w-[100px]">Brand</th>
                <th className="border-r border-slate-800 p-2 w-[80px]">Qty</th>
                <th className="border-r border-slate-800 p-2 w-[80px]">Unit</th>
                <th className="p-2 w-[120px]">Weight</th>
              </tr>
            </thead>
            <tbody>
              {voucher.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-300 last:border-b-0 h-10">
                  <td className="border-r border-slate-800 p-2 text-center">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="border-r border-slate-800 p-2">
                    <div className="uppercase font-medium">{item.itemName}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">[ Inw No : {item.inwardNumber} ]</div>
                  </td>
                  <td className="border-r border-slate-800 p-2 text-center font-bold uppercase">{item.brand || '-'}</td>
                  <td className="border-r border-slate-800 p-2 text-center font-bold">{typeof item.bags === 'number' ? item.bags : ''}</td>
                  <td className="border-r border-slate-800 p-2 text-center uppercase">BAGS</td>
                  <td className="p-2 text-right font-bold">{(item.totalWeight || 0).toFixed(2)}</td>
                </tr>
              ))}

              {[...Array(Math.max(0, 5 - voucher.items.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-200 h-10">
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="p-2" />
                </tr>
              ))}

              <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold h-10">
                <td colSpan={3} className="border-r border-slate-800 p-2 text-right uppercase">Total</td>
                <td className="border-r border-slate-800 p-2 text-center">{totalQty}</td>
                <td className="border-r border-slate-800 p-2" />
                <td className="p-2 text-right">{totalWeight.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between mt-12 text-xs">
          <div className="text-center w-40">
            <div className="pt-8 border-t border-slate-400">
              <p className="font-bold text-[10px]">Driver Signatory</p>
            </div>
          </div>
          <div className="text-center space-y-12">
            <p className="font-bold italic">For <span className="uppercase font-bold">FRESH LINK AGRO COLD STORAGE PVT. LTD.</span></p>
            <div className="pt-8 border-t border-slate-400">
              <p className="font-bold text-[10px]">Authorised Signatory</p>
            </div>
          </div>
          <div className="text-center w-40" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 flex justify-center gap-4 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print Delivery Order
        </Button>
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
