'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { generatedBillsService } from '@/lib/firestore';
import type { GeneratedBill } from '@/lib/types';
import { PrintFooter } from '@/components/print/bill_PrintFooter';

/* =========================================================================
   ASSUMPTIONS / THINGS TO VERIFY AGAINST YOUR REAL CODEBASE
   -------------------------------------------------------------------------
   1. COMPANY_INFO below was read off the physical letterhead in your
      screenshot (OCR by eye) — double-check every field, especially the
      GSTIN and mobile numbers, before printing real invoices.

   2. Your `GeneratedBill` item type currently has single fields:
        issuesQty, issuesWeight, outDetailDate
      The reference bill needs MULTIPLE out-detail entries per item
      (multiple dispatch dates against one inward). Add this to your
      item type in @/lib/types.ts:

        interface BillOutDetail {
          date: string;
          qty: number;
        }

        interface GeneratedBillItem {
          ...
          outDetails?: BillOutDetail[]; // NEW — array of dispatch entries
          outDetailDate?: string;       // keep old field for back-compat
          ...
        }

      If items only ever have ONE out-detail (your current shape), the
      code below still works fine — it falls back to a single row.

   3. `bill.sac` (S.A.C. code) isn't in your original file — I default it
      to '996721' (cold storage services) if the field doesn't exist.
      Add `sac?: string` to GeneratedBill if you want it per-bill.

   4. I removed the <PrintHeader /> component dependency and inlined the
      header markup instead, since I don't have PrintHeader.tsx's props/
      internals. If you'd rather keep using PrintHeader, move the JSX in
      <CompanyHeader /> below into that component and pass the extra
      fields as props.

   5. Swap LOGO_SRC for your actual logo path (whatever PrintHeader was
      using before).
   ========================================================================= */

const COMPANY_INFO = {
  name: 'FRESH LINK AGRO COLD STORAGE PVT. LTD.',
  headOffice: 'Office No.8, Mate Chambers, MukundNagar, Pune - 411037',
  siteAddress: 'Gat No.319, Gaud Dara Road, Khed Shivapur, Tal.Haveli, Dist.Pune - 412205',
  gstin: '27AADCF0847N1ZC',
  mobiles: [
    { number: '+91 9699833995', name: 'Mansoor Shaikh' },
    { number: '+91 9096390079', name: 'Abhijit' },
  ],
  email: 'info@freshlinkagro.in',
  website: 'www.freshlinkagro.in',
};

const LOGO_SRC = '/logo.png'; // TODO: replace with your real logo path
const DEFAULT_SAC = '996721';

interface BillOutDetail {
  date: string;
  qty: number;
}

/** Normalizes an item's out-details into a row array, whatever shape the
 *  underlying data is in (new `outDetails[]`, legacy single field, or none). */
function getOutDetailRows(item: any): BillOutDetail[] {
  if (Array.isArray(item.outDetails) && item.outDetails.length > 0) {
    return item.outDetails;
  }
  if (item.outDetailDate) {
    return [{ date: item.outDetailDate, qty: item.issuesQty || 0 }];
  }
  return [{ date: '', qty: 0 }];
}

/** Groups items into pages by ROW COUNT (not item count), so that an item
 *  with many out-detail sub-rows doesn't silently overflow a page the way
 *  a flat "20 items per page" split would. An item's sub-rows are always
 *  kept together on one page. */
function paginateItems(items: any[], maxRowsPerPage = 20): any[][] {
  const pages: any[][] = [];
  let currentPage: any[] = [];
  let currentRows = 0;

  items.forEach((item) => {
    const rowCount = getOutDetailRows(item).length;

    if (currentRows + rowCount > maxRowsPerPage && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentRows = 0;
    }

    currentPage.push(item);
    currentRows += rowCount;
  });

  if (currentPage.length > 0) pages.push(currentPage);
  return pages.length > 0 ? pages : [[]];
}

function CompanyHeader({
  documentNumber,
  documentDate,
  billMonth,
}: {
  documentNumber: string;
  documentDate: string;
  billMonth: string;
}) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-start gap-4">
        <div className="text-center flex-1">
          <h1 className="text-xl font-bold tracking-wide">{COMPANY_INFO.name}</h1>
        </div>
      </div>

      <div className="flex justify-between items-start gap-4 mt-1">
        <div className="text-[13px] leading-tight space-y-0.5">
          <p><span className="font-bold">Head Off.</span> : {COMPANY_INFO.headOffice}</p>
          <p><span className="font-bold">Site Add</span> : {COMPANY_INFO.siteAddress}</p>
          <p><span className="font-bold">GSTIN</span> : {COMPANY_INFO.gstin}</p>
          <p>
            <span className="font-bold">MOBILE #</span> :{' '}
            {COMPANY_INFO.mobiles
              .map((m) => `${m.number} ${m.name}`)
              .join(', ')}
          </p>
          <p><span className="font-bold">eMail ID</span> : {COMPANY_INFO.email}</p>
          <p><span className="font-bold">Website</span> : {COMPANY_INFO.website}</p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt={COMPANY_INFO.name} className="h-16 flex-shrink-0" />
      </div>

      <div className="border-t-2 border-black my-1.5" />

      <div className="flex justify-center mb-1.5">
        <div className="border border-black px-8 py-1">
          <span className="font-bold text-sm tracking-wide">GST INVOICE</span>
        </div>
      </div>

      {/* <div className="flex justify-between text-xs mb-1">
        <div className="flex gap-1">
          <span className="font-bold">Document No:</span>
          <span>{documentNumber}</span>
        </div>
        <div className="flex gap-1">
          <span className="font-bold">Date:</span>
          <span>{documentDate}</span>
        </div>
      </div> */}
    </div>
  );
}

function SaleBillPrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [bills, setBills] = useState<GeneratedBill[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const billIdsParam = searchParams.get('billIds');

      if (!billIdsParam) {
        router.back();
        return;
      }

      const billIds = billIdsParam.split(',');
      const loadedBills: GeneratedBill[] = [];

      for (const billId of billIds) {
        try {
          const bill = await generatedBillsService.getById(billId);
          if (bill) {
            loadedBills.push(bill);
          }
        } catch (error) {
          console.error('[ERROR] Failed to load bill:', billId, error);
        }
      }

      setBills(loadedBills);
      setLoaded(true);

      setTimeout(() => {
        window.print();
      }, 500);
    }

    load();
  }, [searchParams, router]);

  useEffect(() => {
    const handleAfterPrint = () => {
      router.back();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [router]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading bills...</p>
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No bills to print.</p>
      </div>
    );
  }

  return (
    <div className="bill-print-root p-4 bg-white print:p-0">
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          header, footer, nav, aside { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
         @page { size: A4 portrait; margin: 0mm 0mm; }
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }

        .bill-page {
          break-after: page;
          page-break-after: always;
        }
        .bill-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .no-split {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .bill-table thead {
          display: table-header-group;
        }
        .bill-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .bill-page {
          background: #ffffff;
        }
      `}</style>

      {bills.map((bill) => (
        <BillPrint key={bill.id} bill={bill} />
      ))}
    </div>
  );
}

function BillPrint({ bill }: { bill: GeneratedBill }) {
  const pages = paginateItems(bill.items as any[], 20);
  const totalPages = pages.length;

  // Extract bill sequence from bill number (e.g., "001" from "BILL-2026-07-2796")
  const getBillSequence = (billNumber: string): string => {
    const parts = billNumber.split('-');
    if (parts.length >= 3) {
      return parts[parts.length - 1]; // Get last part (sequence)
    }
    return billNumber; // Return original if format doesn't match
  };

  // Format bill month to human-readable (e.g., "July 2026" from "2026-07")
  const formatBillMonth = (billMonth: string): string => {
    try {
      const [year, month] = billMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return format(date, 'MMMM');
    } catch {
      return billMonth; // Return original if parsing fails
    }
  };

  const totals = (bill.items as any[]).reduce(
    (acc, item) => {
      acc.openingQty += item.openingQty || 0;
      acc.openingWeight += item.openingWeight || 0;
      acc.issuesQty += item.issuesQty || 0;
      acc.issuesWeight += item.issuesWeight || 0;
      acc.closingQty += item.closingQty || 0;
      acc.closingWeight += item.closingWeight || 0;
      return acc;
    },
    { openingQty: 0, openingWeight: 0, issuesQty: 0, issuesWeight: 0, closingQty: 0, closingWeight: 0 }
  );

  return (
    <div className="w-full">
      {pages.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <div
            key={pageIndex}
            className="bill-page w-full flex flex-col min-h-[295mm]"
          >
            <div className="w-full flex-1">
              <div className="no-split w-full">
                <CompanyHeader
                  documentNumber={bill.billNumber}
                  documentDate={format(new Date(bill.billDate), 'dd MMM yyyy')}
                  billMonth={bill.billMonth}
                />

                {/* Customer + bill-meta strip — left/right flex layout */}
                <div className="w-full py-1.5 mb-2 text-xs flex justify-between items-start">
                  {/* Left Section: Customer Information */}
                  <div className="w-1/2 flex flex-col gap-0.5">
                    <div className="flex gap-1">
                      <span className="font-bold w-22 whitespace-nowrap">Customer Name:</span>
                      <span>{bill.clientName}</span>
                    </div>
                    <div className="flex gap-1">
                      <span>{bill.clientAddress || ''}</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="font-bold w-22 whitespace-nowrap">GST No:</span>
                      <span>{bill.clientGstNumber || ''}</span>
                    </div>
                  </div>

                  {/* Right Section: Bill Metadata */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex gap-1">
                      <span className="font-bold w-10 whitespace-nowrap">Bill No:</span>
                      <span>{getBillSequence(bill.billNumber)}</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="font-bold w-16 whitespace-nowrap">Bill Month:</span>
                      <span>{formatBillMonth(bill.billMonth)}</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="font-bold w-13 whitespace-nowrap">Bill Date:</span>
                      <span>{format(new Date(bill.billDate), 'dd.MM.yyyy')}</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="font-bold w-10 whitespace-nowrap">S.A.C.:</span>
                      <span>{(bill as any).sac || DEFAULT_SAC}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table - grouped 2-row header, multi-row out-details per item */}
              <table className="bill-table w-full border-collapse border border-black text-[10px] table-fixed">
                <colgroup>
                  <col className="w-[7%]" />
                  <col className="w-[8%]" />
                  <col className="w-[16%]" />
                  <col className="w-[6%]" />
                  <col className="w-[7%]" />
                  <col className="w-[6%]" />
                  <col className="w-[6%]" />
                  <col className="w-[7%]" />
                  <col className="w-[8%]" />
                  <col className="w-[6%]" />
                  <col className="w-[6%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-100">
                    <th rowSpan={2} className="border border-black px-1 py-1 text-left align-bottom">Inw#</th>
                    <th rowSpan={2} className="border border-black px-1 py-1 text-left align-bottom">Inw Date</th>
                    <th rowSpan={2} className="border border-black px-1 py-1 text-left align-bottom">Item Description</th>
                    <th colSpan={2} className="border border-black px-1 py-1 text-center">Opening</th>
                    <th rowSpan={2} className="border border-black px-1 py-1 text-center align-bottom">Rate<br />MT</th>
                    <th colSpan={2} className="border border-black px-1 py-1 text-center">Issues</th>
                    <th colSpan={2} className="border border-black px-1 py-1 text-center">Out Detail(s)</th>
                    <th colSpan={2} className="border border-black px-1 py-1 text-center">Closing</th>
                    <th rowSpan={2} className="border border-black px-1 py-1 text-right align-bottom">Amount</th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="border border-black px-1 py-1 text-right">Qty</th>
                    <th className="border border-black px-1 py-1 text-right">Weight</th>
                    <th className="border border-black px-1 py-1 text-right">Qty</th>
                    <th className="border border-black px-1 py-1 text-right">Weight</th>
                    <th className="border border-black px-1 py-1 text-left">Date</th>
                    <th className="border border-black px-1 py-1 text-right">Qty</th>
                    <th className="border border-black px-1 py-1 text-right">Qty</th>
                    <th className="border border-black px-1 py-1 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item: any) => {
                    const odRows = getOutDetailRows(item);
                    const rowCount = odRows.length;

                    return odRows.map((od, subIdx) => {
                      const isFirstRow = subIdx === 0;
                      const isLastRow = subIdx === rowCount - 1;

                      return (
                        <tr key={`${item.inwardNo}-${subIdx}`}>
                          {isFirstRow && (
                            <>
                              <td rowSpan={rowCount} className="border border-black px-1 py-0.5 align-top">
                                {item.inwardNo}
                              </td>
                              <td rowSpan={rowCount} className="border border-black px-1 py-0.5 align-top">
                                {format(new Date(item.inwardDate), 'dd.MM.yyyy')}
                              </td>
                              <td rowSpan={rowCount} className="border border-black px-1 py-0.5 align-top uppercase">
                                {item.itemDescription}
                              </td>
                              <td rowSpan={rowCount} className="border border-black px-1 py-0.5 text-right align-top">
                                {item.openingQty}
                              </td>
                              <td rowSpan={rowCount} className="border border-black px-1 py-0.5 text-right align-top">
                                {item.openingWeight.toFixed(2)}
                              </td>
                              <td rowSpan={rowCount} className="border border-black px-1 py-0.5 text-right align-top">
                                {item.rate.toFixed(2)}
                              </td>
                              <td rowSpan={rowCount} className="border border-black px-1 py-0.5 text-right align-top">
                                {item.issuesQty || ''}
                              </td>
                              <td rowSpan={rowCount} className="border border-black px-1 py-0.5 text-right align-top">
                                {item.issuesWeight ? item.issuesWeight.toFixed(2) : ''}
                              </td>
                            </>
                          )}

                          <td className="border border-black px-1 py-0.5">
                            {od.date ? format(new Date(od.date), 'dd.MM.yyyy') : ''}
                          </td>
                          <td className="border border-black px-1 py-0.5 text-right">{od.qty || ''}</td>

                          {isLastRow ? (
                            <>
                              <td className="border border-black px-1 py-0.5 text-right">{item.closingQty}</td>
                              <td className="border border-black px-1 py-0.5 text-right">
                                {item.closingWeight.toFixed(2)}
                              </td>
                              <td className="border border-black px-1 py-0.5 text-right">
                                {item.amount.toFixed(2)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border border-black px-1 py-0.5" />
                              <td className="border border-black px-1 py-0.5" />
                              <td className="border border-black px-1 py-0.5" />
                            </>
                          )}
                        </tr>
                      );
                    });
                  })}

                  {/* Grand-total row across ALL items in the bill — last page only */}
                  {isLastPage && (
                    <tr className="font-bold bg-gray-50">
                      <td colSpan={3} className="border border-black px-1 py-1 text-right">Total</td>
                      <td className="border border-black px-1 py-1 text-right">{totals.openingQty}</td>
                      <td className="border border-black px-1 py-1 text-right">{totals.openingWeight.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1" />
                      <td className="border border-black px-1 py-1 text-right">{totals.issuesQty}</td>
                      <td className="border border-black px-1 py-1 text-right">{totals.issuesWeight.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1" colSpan={2} />
                      <td className="border border-black px-1 py-1 text-right">{totals.closingQty}</td>
                      <td className="border border-black px-1 py-1 text-right">{totals.closingWeight.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1" />
                    </tr>
                  )}

                  {/* Summary rows - merged with main table, last page only */}
                  {isLastPage && (
                    <>
                      <tr>
                        <td colSpan={12} className="border border-black px-2 py-1 text-xs">Gross Amount</td>
                        <td className="border border-black px-2 py-1 text-xs text-right">
                          ₹{bill.grossAmount.toFixed(2)}
                        </td>
                      </tr>

                      <tr>
                        <td colSpan={12} className="border border-black px-2 py-1 text-xs">Varai</td>
                        <td className="border border-black px-2 py-1 text-xs text-right">
                          ₹{bill.varai.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={12} className="border border-black px-2 py-1 text-xs">L/UL</td>
                          <td className="border border-black px-2 py-1 text-xs text-right">
                              ₹{bill.uL.toFixed(2)}
                        </td>
                      </tr>

                      <tr>
                        <td colSpan={12} className="border border-black px-2 py-1 text-xs ">Taxable Amount</td>
                        <td className="border border-black px-2 py-1 text-xs text-right">
                          ₹{bill.taxableAmount.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={12} className="border border-black px-2 py-1 text-xs">CGST @ 9.00%</td>
                        <td className="border border-black px-2 py-1 text-xs text-right">
                          ₹{bill.cgst.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={12} className="border border-black px-2 py-1 text-xs">SGST @ 9.00%</td>
                        <td className="border border-black px-2 py-1 text-xs text-right">
                          ₹{bill.sgst.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={12} className="border border-black px-2 py-1 text-xs">Round</td>
                        <td className="border border-black px-2 py-1 text-xs text-right">
                          ₹{bill.roundOff.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={12} className="border border-black px-2 py-1 text-xs">Net Amount</td>
                        <td className="border border-black px-2 py-1 text-sm text-right">
                          ₹{bill.netAmount.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {isLastPage && (
              <div className="no-split w-full mt-auto flex-shrink-0">
                <PrintFooter /> 
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SaleBillPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      }
    >
      <SaleBillPrintContent />
    </Suspense>
  );
}