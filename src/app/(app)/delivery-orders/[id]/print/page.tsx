'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { useUser } from '@/context/user-context';
import { deliveryOrdersService, clientsService } from '@/lib/firestore';
import type { DeliveryOrder, Client } from '@/lib/types';
import { PrintHeader } from '@/components/print/PrintHeader';
import { PrintFooter } from '@/components/print/PrintFooter';

export default function PrintDeliveryOrderPage() {
  const params = useParams();
  const { user } = useUser();

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    async function load() {
      try {
        const found = await deliveryOrdersService.getById(params.id as string);
        setOrder(found);
        if (found?.clientId) {
          const c = await clientsService.getById(found.clientId);
          setClient(c);
        }
      } catch (err) {
        console.error('Failed to load delivery order:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  useEffect(() => {
    if (!order) return;
    const t = window.setTimeout(() => window.print(), 50);
    return () => window.clearTimeout(t);
  }, [order]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Delivery Order...</div>;
  if (!order) return <div className="p-8 text-center">Delivery Order not found.</div>;

  const handlePrint = () => window.print();

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto bg-white p-8 border shadow-sm print:shadow-none print:border-none">
        {/* Header */}
        <PrintHeader
          documentTitle="Delivery Order"
          documentNumber={order.orderNumber}
          documentDate={format(new Date(order.date), 'dd MMM yyyy')}
        />

        {/* Info Grid */}
        <div className="grid grid-cols-12 gap-y-4 text-xs mb-8">
          <div className="col-span-7 space-y-2 pr-8">
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Customer Name :</span>
              <span className="border-b border-slate-300 flex-1">{client?.name ?? order.clientId}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Address :</span>
              <span className="border-b border-slate-300 flex-1">{order.address}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Remark :</span>
              <span className="border-b border-slate-300 flex-1">{order.remark || 'N/A'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Driver Name :</span>
              <span className="border-b border-slate-300 flex-1 uppercase">{order.driverName}</span>
            </div>
          </div>

          <div className="col-span-5 space-y-2 pl-4">
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Out No :</span>
              <span className="border-b border-slate-300 flex-1 font-mono font-bold text-sm">
                {order.orderNumber}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Date :</span>
              <span className="border-b border-slate-300 flex-1">
                {format(new Date(order.date), 'dd.MM.yyyy')}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Veh.No. :</span>
              <span className="border-b border-slate-300 flex-1 font-mono uppercase">
                {order.vehicleNumber}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-24 shrink-0">Gate Pass No :</span>
              <span className="border-b border-slate-300 flex-1 font-mono">
                {order.gatePassNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-2 border-slate-800 mb-20 overflow-hidden">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-800">
                <th className="border-r border-slate-800 p-2 w-[50px]">Sr.No.</th>
                <th className="border-r border-slate-800 p-2 text-left">
                  Item Description [ Inw No: ]
                </th>
                <th className="border-r border-slate-800 p-2 w-[100px]">Brand</th>
                <th className="border-r border-slate-800 p-2 w-[60px]">Qty</th>
                <th className="border-r border-slate-800 p-2 w-[60px]">Unit</th>
                <th className="border-r border-slate-800 p-2 w-[100px]">Weight</th>
                <th className="p-0 w-[140px]">
                  <div className="border-b border-slate-800 p-1 text-center font-bold">Balance</div>
                  <div className="flex">
                    <span className="w-1/2 border-r border-slate-800 p-1 text-center">Qty</span>
                    <span className="w-1/2 p-1 text-center">Weight</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-300 last:border-b-0 h-10">
                  <td className="border-r border-slate-800 p-2 text-center">
                    {item.srNo.toString().padStart(2, '0')}
                  </td>
                  <td className="border-r border-slate-800 p-2 uppercase font-medium">
                    {item.itemName} [ Inw No: {item.inwardNumber} ]
                  </td>
                  <td className="border-r border-slate-800 p-2 text-center font-bold uppercase">
                    {item.brand}
                  </td>
                  <td className="border-r border-slate-800 p-2 text-center font-bold">
                    {item.quantity}
                  </td>
                  <td className="border-r border-slate-800 p-2 text-center uppercase">{item.unit}</td>
                  <td className="border-r border-slate-800 p-2 text-right font-bold">
                    {item.weight.toFixed(2)}
                  </td>
                  <td className="p-0 text-center">
                    <div className="flex h-full min-h-[40px]">
                      <span className="w-1/2 border-r border-slate-800 p-2 flex items-center justify-center font-bold">
                        {item.balanceQty || ''}
                      </span>
                      <span className="w-1/2 p-2 flex items-center justify-center font-bold">
                        {item.balanceWeight ? item.balanceWeight.toFixed(2) : ''}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {[...Array(Math.max(0, 5 - order.items.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-200 h-10">
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="border-r border-slate-800" />
                  <td className="p-0">
                    <div className="flex h-full min-h-[40px]">
                      <span className="w-1/2 border-r border-slate-800" />
                      <span className="w-1/2" />
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold h-10">
                <td colSpan={3} className="border-r border-slate-800 p-2 text-right uppercase">
                  Total
                </td>
                <td className="border-r border-slate-800 p-2 text-center">
                  {order.items.reduce((acc, i) => acc + i.quantity, 0)}
                </td>
                <td className="border-r border-slate-800 p-2" />
                <td className="border-r border-slate-800 p-2 text-right">
                  {order.items.reduce((acc, i) => acc + i.weight, 0).toFixed(2)}
                </td>
                <td className="p-0" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Signature */}
        <PrintFooter
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
          <Printer className="mr-2 h-4 w-4" /> Print Delivery Order
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
