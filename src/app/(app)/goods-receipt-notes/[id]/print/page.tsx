'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { useUser } from '@/context/user-context';
import { grnService, clientsService } from '@/lib/firestore';
import type { GoodsReceiptNote, Client } from '@/lib/types';

export default function PrintGRNPage() {
  const params = useParams();
  const { user } = useUser();

  const [note, setNote] = useState<GoodsReceiptNote | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    async function load() {
      try {
        const found = await grnService.getById(params.id as string);
        setNote(found);
        if (found?.clientId) {
          const c = await clientsService.getById(found.clientId);
          setClient(c);
        }
      } catch (err) {
        console.error('Failed to load GRN:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => window.print(), 50);
    return () => window.clearTimeout(t);
  }, [note]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Goods Receipt Note...</div>;
  if (!note) return <div className="p-8 text-center">Goods Receipt Note not found.</div>;

  const handlePrint = () => window.print();

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto bg-white p-8 border shadow-sm print:shadow-none print:border-none">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-headline text-slate-800 uppercase leading-tight">
              FRESH LINK AGRO COLD STORAGE PVT. LTD.
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Address : Gat No.319,Gaud Dara Road,Khed Shivapur,Tal.Haveli,Dist.Pune - 412205
              <br />
              MOBILE NO : 9699833995 / 8530818811 / 9423568775
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="w-12 h-12 relative opacity-50 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-green-600">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-green-700 uppercase">Fresh Link</p>
          </div>
        </div>

        <div className="text-center mb-6">
          <span className="border-2 border-slate-800 px-10 py-1 font-bold text-sm bg-slate-50 uppercase tracking-widest">
            Goods Receipt Note
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-12 gap-y-4 text-xs mb-8">
          <div className="col-span-7 space-y-2 pr-8">
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Customer Name :</span>
              <span className="border-b border-slate-300 flex-1 uppercase">{client?.name ?? note.clientId}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Address :</span>
              <span className="border-b border-slate-300 flex-1">{note.address}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Remark :</span>
              <span className="border-b border-slate-300 flex-1">{note.remark || 'N/A'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Driver Name :</span>
              <span className="border-b border-slate-300 flex-1 uppercase">{note.driverName}</span>
            </div>
          </div>

          <div className="col-span-5 space-y-2 pl-4">
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Inw.No:</span>
              <span className="border-b border-slate-300 flex-1 font-mono font-bold text-sm">{note.inwardNumber}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Date :</span>
              <span className="border-b border-slate-300 flex-1">
                {format(new Date(note.date), 'dd.MM.yyyy')}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Veh.No. :</span>
              <span className="border-b border-slate-300 flex-1 font-mono uppercase">{note.vehicleNumber}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Gate Pass No :</span>
              <span className="border-b border-slate-300 flex-1 font-mono">{note.gatePassNumber}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-2 border-slate-800 mb-20 overflow-hidden">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-800">
                <th className="border-r border-slate-800 p-2 w-[50px]">Sr.No.</th>
                <th className="border-r border-slate-800 p-2 text-left">Item Description</th>
                <th className="border-r border-slate-800 p-2 w-[100px]">Brand</th>
                <th className="border-r border-slate-800 p-2 w-[100px]">Batch #</th>
                <th className="border-r border-slate-800 p-2 w-[60px]">Unit</th>
                <th className="border-r border-slate-800 p-2 w-[60px]">Wt / qty</th>
                <th className="border-r border-slate-800 p-2 w-[60px]">Qty</th>
                <th className="p-2 w-[100px]">Weight</th>
              </tr>
            </thead>
            <tbody>
              {note.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-300 last:border-b-0 h-10">
                  <td className="border-r border-slate-800 p-2 text-center">
                    {item.srNo.toString().padStart(2, '0')}
                  </td>
                  <td className="border-r border-slate-800 p-2 uppercase font-medium">{item.itemName}</td>
                  <td className="border-r border-slate-800 p-2 text-center font-bold uppercase">{item.brand || '-'}</td>
                  <td className="border-r border-slate-800 p-2 text-center font-mono">{item.batchNumber || '-'}</td>
                  <td className="border-r border-slate-800 p-2 text-center uppercase">{item.unit}</td>
                  <td className="border-r border-slate-800 p-2 text-center">{item.weightPerQty}</td>
                  <td className="border-r border-slate-800 p-2 text-center font-bold">{item.quantity}</td>
                  <td className="p-2 text-right font-bold">{item.weight.toFixed(2)}</td>
                </tr>
              ))}
              {[...Array(Math.max(0, 5 - note.items.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-200 h-10">
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="p-2" />
                </tr>
              ))}
              <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold h-10">
                <td colSpan={6} className="border-r border-slate-800 p-2 text-right uppercase">Total</td>
                <td className="border-r border-slate-800 p-2 text-center">
                  {note.items.reduce((acc, i) => acc + i.quantity, 0)}
                </td>
                <td className="p-2 text-right">
                  {note.items.reduce((acc, i) => acc + i.weight, 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Signatures */}
        <div className="flex justify-between mt-12 text-xs">
          <div className="text-center w-40">
            <div className="pt-8 border-t border-slate-400">
              <p className="font-bold text-[10px]">Driver Signatory</p>
            </div>
          </div>
          <div className="text-center space-y-12">
            <p className="font-bold italic">
              For{' '}
              <span className="uppercase font-bold">Fresh Link Agro Cold Storage Pvt. Ltd.</span>
            </p>
            <div className="pt-8 border-t border-slate-400">
              <p className="font-bold text-[10px]">Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 flex justify-center gap-4 print:hidden">
        {(user?.role === 'ADMIN' || user?.role === 'MASTER_ADMIN') && (
          <Button variant="outline" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        )}
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print GRN
        </Button>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          header, footer, nav, aside { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
