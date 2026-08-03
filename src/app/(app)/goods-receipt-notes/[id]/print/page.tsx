'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { useUser } from '@/context/user-context';
import { grnService, clientsService } from '@/lib/firestore';
import type { GoodsReceiptNote, Client } from '@/lib/types';
import { PrintHeader } from '@/components/print/PrintHeader';
import { PrintFooter } from '@/components/print/PrintFooter';

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
        <PrintHeader
          documentTitle="Goods Receipt Note"
        />

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
              <span className="border-b border-slate-300 flex-1 font-mono text-sm">{note.inwardNumber}</span>
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
        <PrintFooter
          showDriverSignature={true}
          showAuthorisedSignature={true}
        />
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
