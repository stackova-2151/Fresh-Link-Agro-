'use client';

import { useParams } from 'next/navigation';
import { deliveryOrders, clients } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { DeliveryOrder } from '@/lib/types';
import { useUser } from '@/context/user-context';

export default function PrintDeliveryOrderPage() {
    const params = useParams();
    const { user } = useUser();
    const [order, setOrder] = useState<DeliveryOrder | null>(null);

    useEffect(() => {
        if (params.id) {
            const found = deliveryOrders.find(o => o.id === params.id);
            setOrder(found || null);
        }
    }, [params.id]);

    if (!order) return <div className="p-8 text-center">Loading Delivery Order...</div>;

    const client = clients.find(c => c.id === order.clientId);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-slate-50 min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto bg-white p-8 border shadow-sm print:shadow-none print:border-none">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold font-headline text-slate-800">FRESH LINK AGRO COLD STORAGE PVT. LTD.</h1>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            Address : Gat No.319,Gaud Dara Road,Khed Shivapur,Tal.Haveli,Dist.Pune - 412205<br />
                            MOBILE NO : 9699833995 / 8530818811 / 9423568775
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <div className="w-12 h-12 relative opacity-50 mb-1">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-green-600"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                        </div>
                        <p className="text-[10px] font-bold text-green-700">Fresh Link</p>
                    </div>
                </div>

                <div className="text-center mb-6">
                    <span className="border-2 border-slate-800 px-10 py-1 font-bold text-sm bg-slate-50 uppercase tracking-widest">Delivery Order</span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-12 gap-y-4 text-xs mb-8">
                    <div className="col-span-7 space-y-2 pr-8">
                        <div className="flex gap-2">
                            <span className="font-bold w-28 shrink-0">Customer Name :</span>
                            <span className="border-b border-slate-300 flex-1">{client?.name}</span>
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
                            <span className="border-b border-slate-300 flex-1">{order.driverName}</span>
                        </div>
                    </div>
                    
                    <div className="col-span-5 space-y-2 pl-4">
                        <div className="flex gap-2">
                            <span className="font-bold w-24 shrink-0">Out No :</span>
                            <span className="border-b border-slate-300 flex-1 font-mono font-bold">{order.orderNumber}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold w-24 shrink-0">Date :</span>
                            <span className="border-b border-slate-300 flex-1">{format(order.date, 'dd.01.2026')}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold w-24 shrink-0">Veh.No. :</span>
                            <span className="border-b border-slate-300 flex-1 font-mono">{order.vehicleNumber}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold w-24 shrink-0">Gate Pass No :</span>
                            <span className="border-b border-slate-300 flex-1 font-mono">{order.gatePassNumber}</span>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="border-2 border-slate-800 mb-20 overflow-hidden">
                    <table className="w-full text-[11px] border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-800">
                                <th className="border-r border-slate-800 p-2 w-[50px]">Sr.No.</th>
                                <th className="border-r border-slate-800 p-2 text-left">Item Description [ Inw No: ]</th>
                                <th className="border-r border-slate-800 p-2 w-[100px]">Brand</th>
                                <th className="border-r border-slate-800 p-2 w-[60px]">Qty</th>
                                <th className="border-r border-slate-800 p-2 w-[60px]">Unit</th>
                                <th className="border-r border-slate-800 p-2 w-[100px]">Weight</th>
                                <th className="p-0 w-[120px]">
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
                                    <td className="border-r border-slate-800 p-2 text-center">{item.srNo.toString().padStart(2, '0')}</td>
                                    <td className="border-r border-slate-800 p-2">{item.itemName} [ Inw No: {item.inwardNumber} ]</td>
                                    <td className="border-r border-slate-800 p-2 text-center font-bold uppercase">{item.brand}</td>
                                    <td className="border-r border-slate-800 p-2 text-center font-bold">{item.quantity}</td>
                                    <td className="border-r border-slate-800 p-2 text-center uppercase">{item.unit}</td>
                                    <td className="border-r border-slate-800 p-2 text-right font-bold">{item.weight.toFixed(2)}</td>
                                    <td className="p-0 text-center">
                                        <div className="flex h-full min-h-[40px]">
                                            <span className="w-1/2 border-r border-slate-800 p-2 flex items-center justify-center font-bold">{item.balanceQty}</span>
                                            <span className="w-1/2 p-2 flex items-center justify-center font-bold">{item.balanceWeight.toFixed(2)}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {/* Empty rows to match style */}
                            {[...Array(3)].map((_, i) => (
                                <tr key={`empty-${i}`} className="border-b border-slate-200 h-10">
                                    <td className="border-r border-slate-800" />
                                    <td className="border-r border-slate-800" />
                                    <td className="border-r border-slate-800" />
                                    <td className="border-r border-slate-800" />
                                    <td className="border-r border-slate-800" />
                                    <td className="border-r border-slate-800" />
                                    <td />
                                </tr>
                            ))}
                            <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold h-10">
                                <td colSpan={3} className="border-r border-slate-800 p-2 text-right uppercase">Total</td>
                                <td className="border-r border-slate-800 p-2 text-center">{order.items.reduce((acc, i) => acc + i.quantity, 0)}</td>
                                <td className="border-r border-slate-800 p-2" />
                                <td className="border-r border-slate-800 p-2 text-right">{order.items.reduce((acc, i) => acc + i.weight, 0).toFixed(2)}</td>
                                <td className="p-0" />
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Signature */}
                <div className="flex justify-end mt-12 text-xs">
                    <div className="text-center space-y-12">
                        <p className="font-bold">For <span className="uppercase">Fresh Link Agro Cold Storage Pvt. Ltd.</span></p>
                        <div className="pt-8 border-t border-slate-400">
                             <p className="font-bold text-[10px]">Authorised Signatory</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto mt-6 flex justify-center gap-4 print:hidden">
                {user?.role === 'Admin' && (
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
                    .card { border: none !important; box-shadow: none !important; }
                    @page { margin: 1.5cm; }
                }
            `}</style>
        </div>
    );
}
