'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

import { db } from '@/lib/firebase';
import { clientsService, rentalItemsService } from '@/lib/firestore';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';
import type { Client, RentalItem } from '@/lib/types';
import { PrintHeader } from '@/components/print/PrintHeader';
import { PrintFooter } from '@/components/print/PrintFooter';

async function loadVoucherByOutwardNo(outwardNo: string): Promise<OutwardVoucher | null> {
  try {
    const snap = await getDocs(
      query(collection(db, 'outwardVouchers'), where('outwardNo', '==', outwardNo))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as OutwardVoucher;
  } catch {
    return null;
  }
}

function parseOutwardSeq(outwardNo: string): number | null {
  const match = /^OUT-(\d+)$/.exec(outwardNo.trim().toUpperCase());
  if (!match) return null;
  const seq = Number(match[1]);
  return Number.isFinite(seq) ? seq : null;
}

export default function OutwardPrintPage() {
  const params = useParams();
  const router = useRouter();
  const outwardNoParam = (params.outwardNo as string | undefined) ?? '';

  const [voucher, setVoucher] = useState<OutwardVoucher | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [allOutwardVouchers, setAllOutwardVouchers] = useState<OutwardVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = decodeURIComponent(outwardNoParam || '').trim().toUpperCase();

    async function load() {
      const found = await loadVoucherByOutwardNo(key);
      setVoucher(found);

      if (found?.clientId) {
        const c = await clientsService.getById(found.clientId);
        setClient(c);

        // Load all outward vouchers for this client for historical balance calculation
        const allVouchersSnap = await getDocs(
          query(collection(db, 'outwardVouchers'), where('clientId', '==', found.clientId))
        );
        const allVouchers = allVouchersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
        setAllOutwardVouchers(allVouchers);
      }

      // Load rental items for inward quantity reference
      const items = await rentalItemsService.getAll();
      setRentalItems(items);

      setLoading(false);
    }

    load();
  }, [outwardNoParam]);

  // Trigger print only after loading is complete and DOM is rendered
  useEffect(() => {
    if (loading) return;
    if (!voucher) return;

    // Wait for next frame to ensure React has finished rendering
    requestAnimationFrame(() => {
      window.print();
    });
  }, [loading, voucher]);

  // Return to previous page after print dialog closes
  useEffect(() => {
    const handleAfterPrint = () => {
      router.back();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [router]);

  const totalQty = useMemo(() => {
    if (!voucher) return 0;
    return voucher.items.reduce((sum, r) => sum + (typeof r.bags === 'number' ? r.bags : 0), 0);
  }, [voucher]);

  const totalWeight = useMemo(() => {
    if (!voucher) return 0;
    return voucher.items.reduce((sum, r) => sum + (r.totalWeight || 0), 0);
  }, [voucher]);

  // Get the current voucher's outward sequence for historical balance calculation
  const currentVoucherSeq = useMemo(() => {
    if (!voucher) return null;
    return parseOutwardSeq(voucher.outwardNo);
  }, [voucher]);

  // Create map of rental items by ID for inward quantity reference
  const rentalItemsMap = useMemo(() => {
    const map = new Map<string, RentalItem>();
    rentalItems.forEach(item => map.set(item.id, item));
    return map;
  }, [rentalItems]);

  // Calculate historical balance for a single outward item
  const calculateHistoricalBalance = useMemo(() => {
    return (item: { sourceRentalItemId?: string; bags: number | ''; totalWeight: number }): { qty: number; weight: number } => {
      if (!currentVoucherSeq || !item.sourceRentalItemId) {
        return { qty: 0, weight: 0 };
      }

      const rentalItem = rentalItemsMap.get(item.sourceRentalItemId);
      if (!rentalItem) {
        return { qty: 0, weight: 0 };
      }

      // Get original inward quantity and weight
      const inwardQty = rentalItem.inwardQuantity;
      const inwardWeight = rentalItem.inwardWeight;

      // Sum outward quantities from vouchers with sequence <= current voucher
      let cumulativeOutQty = 0;
      let cumulativeOutWeight = 0;

      allOutwardVouchers.forEach((v) => {
        const vSeq = parseOutwardSeq(v.outwardNo);
        if (vSeq && vSeq <= currentVoucherSeq) {
          v.items.forEach((vItem) => {
            if (vItem.sourceRentalItemId === item.sourceRentalItemId) {
              cumulativeOutQty += typeof vItem.bags === 'number' ? vItem.bags : 0;
              cumulativeOutWeight += vItem.totalWeight || 0;
            }
          });
        }
      });

      // Calculate historical balance
      const balanceQty = Math.max(0, inwardQty - cumulativeOutQty);
      const balanceWeight = Math.max(0, inwardWeight - cumulativeOutWeight);

      return { qty: balanceQty, weight: balanceWeight };
    };
  }, [currentVoucherSeq, rentalItemsMap, allOutwardVouchers]);

  // Calculate balance totals
  const totalBalanceQty = useMemo(() => {
    if (!voucher) return 0;
    return voucher.items.reduce((sum, item) => {
      const balance = calculateHistoricalBalance(item);
      return sum + balance.qty;
    }, 0);
  }, [voucher, calculateHistoricalBalance]);

  const totalBalanceWeight = useMemo(() => {
    if (!voucher) return 0;
    return voucher.items.reduce((sum, item) => {
      const balance = calculateHistoricalBalance(item);
      return sum + balance.weight;
    }, 0);
  }, [voucher, calculateHistoricalBalance]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!voucher) return <div className="p-8 text-center">Voucher not found: {decodeURIComponent(outwardNoParam || '')}</div>;

  return (
    <div className="bg-slate-50 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto bg-white p-8 border shadow-sm print:shadow-none print:border-none">
        <PrintHeader
          documentTitle="Goods Dispatch Note"
        />

        <div className="grid grid-cols-12 gap-y-4 text-xs mb-8">
          <div className="col-span-7 space-y-2 pr-8">
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">Customer Name :</span><span className="border-b border-slate-300 flex-1 uppercase">{voucher.clientName}</span></div>
             <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Customer No. :</span>
              <span className="border-b border-slate-300 flex-1">{client?.phone || client?.optionalPhone || ''}</span>
            </div>
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">Address :</span><span className="border-b border-slate-300 flex-1">{client?.address ?? ''}</span></div>
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">Remark :</span><span className="border-b border-slate-300 flex-1">{voucher.notes || ''}</span></div>
          </div>
          <div className="col-span-5 space-y-2 pl-4">
            <div className="flex gap-2"><span className="font-bold w-24 shrink-0">Out No :</span><span className="border-b border-slate-300 flex-1 font-mono text-sm">{voucher.outwardNo}</span></div>
            <div className="flex gap-2"><span className="font-bold w-24 shrink-0">Date :</span><span className="border-b border-slate-300 flex-1">{format(new Date(voucher.date), 'dd.MM.yyyy')}</span></div>
            <div className="flex gap-2"><span className="font-bold w-24 shrink-0">Veh.No. :</span><span className="border-b border-slate-300 flex-1 font-mono uppercase">{voucher.vehicleNo}</span></div>
            <div className="flex gap-2"><span className="font-bold w-24 shrink-0">Gate Pass No :</span><span className="border-b border-slate-300 flex-1 font-mono">{voucher.gatePassNo}</span></div>
          </div>
        </div>

        <div className="border-2 border-slate-800">
          <table className="w-full text-[11px] border-collapse" style={{ pageBreakInside: 'avoid' }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr className="bg-slate-50 border-b-2 border-slate-800">
                <th className="border-r border-slate-800 px-1 py-1 w-[40px]" rowSpan={2}>Sr.No.</th>
                <th className="border-r border-slate-800 px-1 py-1 text-left" rowSpan={2}>Item Name</th>
                <th className="border-r border-slate-800 px-1 py-1 w-[80px]" rowSpan={2}>Brand</th>
                <th className="border-r border-slate-800 px-1 py-1 w-[60px]" rowSpan={2}>Qty</th>
                <th className="border-r border-slate-800 px-1 py-1 w-[70px]" rowSpan={2}>Unit</th>
                <th className="border-r border-slate-800 px-1 py-1 w-[70px]" rowSpan={2}>Weight</th>
                <th className="px-1 py-1 w-[100px]" colSpan={2}>Balance</th>
              </tr>
              <tr className="bg-slate-50 border-b-2 border-slate-800">
                <th className="border-r border-slate-800 px-1 py-1 w-[50px]">Qty</th>
                <th className="px-1 py-1 w-[50px]">Weight</th>
              </tr>
            </thead>
            <tbody>
              {voucher.items.map((item, idx) => {
                const balance = calculateHistoricalBalance(item);
                return (
                  <tr key={item.id} className="border-b border-slate-300 last:border-b-0" style={{ pageBreakInside: 'avoid' }}>
                    <td className="border-r border-slate-800 px-1 py-1 text-center">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="border-r border-slate-800 px-1 py-1">
                      <span className="uppercase font-medium">
                        {item.itemName}
                      </span>

                      <span className="ml-4 text-[10px] font-semibold normal-case text-slate-700">
                        [ Inw No : {item.inwardNumber} ]
                      </span>
                    </td>
                    <td className="border-r border-slate-800 px-1 py-1 text-center font-bold uppercase">{item.brand || '-'}</td>
                    <td className="border-r border-slate-800 px-1 py-1 text-center font-bold">{typeof item.bags === 'number' ? item.bags : ''}</td>
                    <td className="border-r border-slate-800 px-1 py-1 text-center uppercase">BAGS</td>
                    <td className="border-r border-slate-800 px-1 py-1 text-right font-bold">{(item.totalWeight || 0).toFixed(2)}</td>
                    <td className="border-r border-slate-800 px-1 py-1 text-center font-bold">{balance.qty}</td>
                    <td className="px-1 py-1 text-right font-bold">{balance.weight.toFixed(2)}</td>
                  </tr>
                );
              })}
              {[...Array(Math.max(0, 5 - voucher.items.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-200">
                  <td className="border-r border-slate-800 px-1 py-1" /><td className="border-r border-slate-800 px-1 py-1" />
                  <td className="border-r border-slate-800 px-1 py-1" /><td className="border-r border-slate-800 px-1 py-1" />
                  <td className="border-r border-slate-800 px-1 py-1" /><td className="border-r border-slate-800 px-1 py-1" />
                  <td className="border-r border-slate-800 px-1 py-1" /><td className="px-1 py-1" />
                </tr>
              ))}
            </tbody>
            <tfoot style={{ display: 'table-footer-group' }}>
              <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold">
                <td colSpan={3} className="border-r border-slate-800 px-1 py-1 text-right uppercase">Total</td>
                <td className="border-r border-slate-800 px-1 py-1 text-center">{totalQty}</td>
                <td className="border-r border-slate-800 px-1 py-1" />
                <td className="border-r border-slate-800 px-1 py-1 text-right">{totalWeight.toFixed(2)}</td>
                <td className="border-r border-slate-800 px-1 py-1 text-center">{totalBalanceQty}</td>
                <td className="px-1 py-1 text-right">{totalBalanceWeight.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

<PrintFooter
  customSignatures={[
    {
      label: "Driver Signatory",
      name: voucher.driverName,
      mobile: voucher.mobile,
    },
    {
      label: "Authorised Signatory",
    },
  ]}
/>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          
          /* Only hide application navigation, not print-footer component */
          header:not(.print-header),
          footer:not(.print-footer),
          nav,
          aside {
            display: none !important;
          }
          
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          @page { margin: 1.5cm; }
          
          /* Table print semantics */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          
          /* Prevent unwanted page breaks */
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          td, th { page-break-inside: avoid; }
          
          /* Ensure footer stays with table */
          tfoot tr { page-break-inside: avoid; }
          
          /* Ensure print-footer is visible and stays with content */
          .print-footer {
            display: block !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
