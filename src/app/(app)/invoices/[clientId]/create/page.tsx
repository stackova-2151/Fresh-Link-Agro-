'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { clients, rentalItems, invoices } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import { useUser } from '@/context/user-context';
import { Badge } from '@/components/ui/badge';

interface StorageInvoiceItem {
  inwNo: string;
  inwDate: string;
  description: string;
  opening: { qty: number; weight: number };
  rateMT: number;
  issues: { qty: number; weight: number };
  outDetails: { date: string; qty: number }[];
  closing: { qty: number; weight: number };
  amount: number;
}

export default function CreateInvoicePage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { user } = useUser();

  const client = clients.find(c => c.id === clientId);
  const clientItems = rentalItems.filter(item => item.clientId === clientId);
  
  const [invoiceNo, setInvoiceNo] = useState('');
  const [billDate, setBillDate] = useState(new Date());
  const [billMonth, setBillMonth] = useState('');
  const [storageItems, setStorageItems] = useState<StorageInvoiceItem[]>([]);
  const [totals, setTotals] = useState({ gross: 0, net: 0, tax: 0, varai: 0, lul: 0, taxable: 0 });

  useEffect(() => {
    // Logic for SHEETAL ENTERPRISES specific invoice from image
    if (clientId === 'cust_03') {
        setInvoiceNo("02163");
        setBillDate(new Date(2026, 1, 5));
        setBillMonth('JANUARY');
        
        const mapped: StorageInvoiceItem[] = [
            { inwNo: '07362', inwDate: '07.07.2025', description: 'WHIIP CREAM', opening: { qty: 5, weight: 60 }, rateMT: 1500, issues: { qty: 0, weight: 0 }, outDetails: [], closing: { qty: 5, weight: 60 }, amount: 90 },
            { inwNo: '07994', inwDate: '23.11.2025', description: 'WHIIP CREAM', opening: { qty: 3, weight: 36 }, rateMT: 1500, issues: { qty: 3, weight: 36 }, outDetails: [{date: '14.01.2026', qty: 3}], closing: { qty: 0, weight: 0 }, amount: 54 },
            { inwNo: '08152', inwDate: '26.12.2025', description: 'WHIIP CREAM', opening: { qty: 30, weight: 360 }, rateMT: 1500, issues: { qty: 30, weight: 360 }, outDetails: [{date: '02.01.2026', qty: 20}, {date: '14.01.2026', qty: 10}], closing: { qty: 0, weight: 0 }, amount: 540 },
            { inwNo: '08213', inwDate: '09.01.2026', description: 'WHIIP CREAM', opening: { qty: 100, weight: 1200 }, rateMT: 1500, issues: { qty: 100, weight: 1200 }, outDetails: [{date: '14.01.2026', qty: 10}, {date: '19.01.2026', qty: 40}, {date: '23.01.2026', qty: 20}, {date: '28.01.2026', qty: 30}], closing: { qty: 0, weight: 0 }, amount: 1800 },
            { inwNo: '08213', inwDate: '09.01.2026', description: 'CHOCO TRAPHAL', opening: { qty: 20, weight: 240 }, rateMT: 1500, issues: { qty: 0, weight: 0 }, outDetails: [], closing: { qty: 20, weight: 240 }, amount: 360 },
        ];
        
        setStorageItems(mapped);
        setTotals({ 
            gross: 2844, 
            varai: 300.56, 
            lul: 432, 
            taxable: 3576.56, 
            tax: 643.78, 
            net: 4220 
        });
    } else {
        const invNo = `0${Math.floor(Math.random() * 9000) + 2000}`;
        setInvoiceNo(invNo);
        setBillMonth(format(new Date(), 'MMMM').toUpperCase());

        const mapped = clientItems.map(item => {
          const rate = 1500; 
          const amount = (item.inwardWeight / 1000) * rate;
          
          return {
            inwNo: item.inwardNumber,
            inwDate: format(item.storageDate, 'dd.MM.yyyy'),
            description: `${item.name} (${item.brand})`,
            opening: { qty: item.inwardQuantity, weight: item.inwardWeight },
            rateMT: rate,
            issues: { qty: item.outwardQuantity, weight: item.outwardWeight },
            outDetails: item.outwardQuantity > 0 ? [{ date: format(new Date(), 'dd.MM.yyyy'), qty: item.outwardQuantity }] : [],
            closing: { qty: item.quantityAvailable, weight: item.balanceWeight },
            amount: amount,
          };
        });

        const gross = mapped.reduce((acc, item) => acc + item.amount, 0);
        const taxable = gross;
        const tax = taxable * 0.18;
        setStorageItems(mapped);
        setTotals({ gross, tax, net: Math.round(gross + tax), varai: 0, lul: 0, taxable });
    }
  }, [clientId, clientItems]);

  const handlePrint = () => {
    window.print();
  };

  if (!client) return <div>Client not found</div>;

  const upiUrl = `upi://pay?pa=freshlink@bank&pn=FreshLink%20Agro&am=${totals.net}&cu=INR&tn=Bill%20${invoiceNo}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

  const totalOpeningQty = storageItems.reduce((acc, item) => acc + item.opening.qty, 0);
  const totalOpeningWt = storageItems.reduce((acc, item) => acc + item.opening.weight, 0);
  const totalIssuesQty = storageItems.reduce((acc, item) => acc + item.issues.qty, 0);
  const totalIssuesWt = storageItems.reduce((acc, item) => acc + item.issues.weight, 0);
  const totalClosingQty = storageItems.reduce((acc, item) => acc + item.closing.qty, 0);
  const totalClosingWt = storageItems.reduce((acc, item) => acc + item.closing.weight, 0);

  return (
    <div className="space-y-6 print:p-0 print:m-0">
      <PageHeader title="Storage Bill Generation" description="Generate professional storage invoice with automatic calculations." className="print:hidden">
        <div className="flex gap-2">
            <Badge variant="outline" className="h-10 px-4 capitalize bg-slate-100">{client.billingCycle} Cycle</Badge>
            {user?.role === 'Admin' && (
              <Button variant="outline" onClick={handlePrint}>
                <Download className="mr-2 h-4 w-4"/> PDF
              </Button>
            )}
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
        </div>
      </PageHeader>
      
      <Card className="max-w-5xl mx-auto border-2 shadow-none print:border-none print:w-full">
        <CardHeader className="p-8 space-y-6">
          <div className="flex justify-between items-start border-b-2 pb-6 border-slate-800">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold font-headline text-slate-800 uppercase leading-tight">FRESH LINK AGRO COLD STORAGE PVT. LTD.</h1>
              <div className="text-[10px] text-muted-foreground leading-tight space-y-0.5">
                <p>Off. : Office No. 8, Mate Chambers, Mukund Nagar, Pune - 411037</p>
                <p>Add : Gat No. 319, Gaud Dara Road, Khed Shivapur, Tal. Haveli, Dist. Pune - 412205</p>
                <p>GSTIN : 27AADCF0847N1ZC | S.A.C. : 996721</p>
                <p>MOBILE # : +91 9699833995 Mansoor Shaikh, +91 9096390079 Abhijit</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <div className="w-14 h-14 relative opacity-40">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-14 h-14 text-green-600"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
              </div>
              <p className="text-xs font-bold text-green-700 font-headline uppercase">Fresh Link</p>
            </div>
          </div>

          <div className="flex justify-center -mt-4">
             <span className="border-2 border-slate-800 px-10 py-1 font-bold text-sm bg-slate-50 uppercase tracking-[0.2em]">GST Storage Invoice</span>
          </div>

          <div className="grid grid-cols-2 text-xs gap-x-12">
            <div className="space-y-2">
              <div className="flex border-b border-slate-200 pb-1">
                <span className="font-bold w-28 shrink-0">Customer Name :</span>
                <span className="uppercase font-semibold">{client.name}</span>
              </div>
              <div className="flex border-b border-slate-200 pb-1">
                <span className="font-bold w-28 shrink-0">GST No :</span>
                <span className="font-mono">{client.gstNumber || 'N/A'}</span>
              </div>
              <div className="flex border-b border-slate-200 pb-1">
                <span className="font-bold w-28 shrink-0">Address :</span>
                <span className="text-[10px] leading-tight">{client.address}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex border-b border-slate-200 pb-1">
                <span className="font-bold w-24 shrink-0">Bill No :</span>
                <span className="font-mono font-bold text-sm">{invoiceNo}</span>
              </div>
              <div className="flex border-b border-slate-200 pb-1">
                <span className="font-bold w-24 shrink-0">Bill Month :</span>
                <span className="font-semibold">{billMonth}</span>
              </div>
              <div className="flex border-b border-slate-200 pb-1">
                <span className="font-bold w-24 shrink-0">Bill Date :</span>
                <span>{format(billDate, 'dd.MM.yyyy')}</span>
              </div>
               <div className="flex border-b border-slate-200 pb-1">
                <span className="font-bold w-24 shrink-0">Cycle :</span>
                <span className="capitalize font-semibold">{client.billingCycle}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 border-t-2 border-b-2 border-slate-800">
          <Table className="border-collapse">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-b-2 border-slate-800">
                <TableHead className="border-r border-slate-800 h-10 text-[9px] px-1 font-bold text-slate-800">Inw#</TableHead>
                <TableHead className="border-r border-slate-800 text-[9px] px-1 font-bold text-slate-800">Inw Date</TableHead>
                <TableHead className="border-r border-slate-800 text-[9px] px-1 font-bold text-slate-800">Item Description</TableHead>
                <TableHead className="border-r border-slate-800 text-center p-0 font-bold text-slate-800">
                  <div className="border-b border-slate-800 px-1 py-1 text-[9px]">Opening</div>
                  <div className="flex text-[8px]">
                    <span className="w-1/2 border-r border-slate-800">Qty</span>
                    <span className="w-1/2">Wt</span>
                  </div>
                </TableHead>
                <TableHead className="border-r border-slate-800 text-[9px] px-1 font-bold text-slate-800">Rate MT</TableHead>
                <TableHead className="border-r border-slate-800 text-center p-0 font-bold text-slate-800">
                   <div className="border-b border-slate-800 px-1 py-1 text-[9px]">Issues</div>
                   <div className="flex text-[8px]">
                    <span className="w-1/2 border-r border-slate-800">Qty</span>
                    <span className="w-1/2">Wt</span>
                  </div>
                </TableHead>
                <TableHead className="border-r border-slate-800 text-center p-0 font-bold text-slate-800">
                   <div className="border-b border-slate-800 px-1 py-1 text-[9px]">Out Detail(s)</div>
                   <div className="flex text-[8px]">
                    <span className="w-1/2 border-r border-slate-800">Date</span>
                    <span className="w-1/2">Qty</span>
                  </div>
                </TableHead>
                <TableHead className="border-r border-slate-800 text-center p-0 font-bold text-slate-800">
                   <div className="border-b border-slate-800 px-1 py-1 text-[9px]">Closing</div>
                   <div className="flex text-[8px]">
                    <span className="w-1/2 border-r border-slate-800">Qty</span>
                    <span className="w-1/2">Wt</span>
                  </div>
                </TableHead>
                <TableHead className="text-[9px] px-1 font-bold text-slate-800 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storageItems.map((item, index) => (
                <TableRow key={index} className="hover:bg-transparent border-b border-slate-300 last:border-b-0 h-10">
                  <TableCell className="border-r border-slate-800 text-[9px] py-1 px-1 font-mono">{item.inwNo}</TableCell>
                  <TableCell className="border-r border-slate-800 text-[9px] py-1 px-1">{item.inwDate}</TableCell>
                  <TableCell className="border-r border-slate-800 text-[9px] py-1 px-1 font-medium">{item.description}</TableCell>
                  <TableCell className="border-r border-slate-800 p-0 text-[9px] text-center">
                    <div className="flex h-full min-h-[40px]">
                      <span className="w-1/2 border-r border-slate-800 flex items-center justify-center">{item.opening.qty}</span>
                      <span className="w-1/2 flex items-center justify-center">{item.opening.weight}</span>
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-slate-800 text-[9px] py-1 px-1 text-center font-mono">{item.rateMT.toFixed(2)}</TableCell>
                  <TableCell className="border-r border-slate-800 p-0 text-[9px] text-center">
                    <div className="flex h-full min-h-[40px]">
                      <span className="w-1/2 border-r border-slate-800 flex items-center justify-center">{item.issues.qty || ''}</span>
                      <span className="w-1/2 flex items-center justify-center">{item.issues.weight || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-slate-800 p-0 text-[9px] text-center bg-slate-50/30">
                    {item.outDetails.map((od, i) => (
                      <div key={i} className="flex border-b border-slate-200 last:border-0 h-5 items-center">
                        <span className="w-1/2 border-r border-slate-200 text-[7px]">{od.date}</span>
                        <span className="w-1/2">{od.qty}</span>
                      </div>
                    ))}
                    {item.outDetails.length === 0 && <div className="h-5" />}
                  </TableCell>
                  <TableCell className="border-r border-slate-800 p-0 text-[9px] text-center">
                    <div className="flex h-full min-h-[40px]">
                      <span className="w-1/2 border-r border-slate-800 flex items-center justify-center">{item.closing.qty || ''}</span>
                      <span className="w-1/2 flex items-center justify-center">{item.closing.weight || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] py-1 px-1 text-right font-bold">{item.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-800 h-10">
                <TableCell colSpan={3} className="text-right border-r border-slate-800 text-[10px] uppercase">Page Total</TableCell>
                <TableCell className="border-r border-slate-800 p-0 text-[9px] text-center">
                    <div className="flex">
                        <span className="w-1/2 border-r border-slate-800 py-2">{totalOpeningQty}</span>
                        <span className="w-1/2 py-2">{totalOpeningWt}</span>
                    </div>
                </TableCell>
                <TableCell className="border-r border-slate-800" />
                <TableCell className="border-r border-slate-800 p-0 text-[9px] text-center">
                    <div className="flex">
                        <span className="w-1/2 border-r border-slate-800 py-2">{totalIssuesQty}</span>
                        <span className="w-1/2 py-2">{totalIssuesWt.toFixed(2)}</span>
                    </div>
                </TableCell>
                <TableCell className="border-r border-slate-800 p-0 text-[9px] text-center">
                    <div className="flex">
                        <span className="w-1/2 border-r border-slate-800" />
                        <span className="w-1/2 py-2">{totalIssuesQty}</span>
                    </div>
                </TableCell>
                <TableCell className="border-r border-slate-800 p-0 text-[9px] text-center">
                    <div className="flex">
                        <span className="w-1/2 border-r border-slate-800 py-2">{totalClosingQty}</span>
                        <span className="w-1/2 py-2">{totalClosingWt}</span>
                    </div>
                </TableCell>
                <TableCell className="text-right font-bold text-sm">{totals.gross.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="p-8 block">
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-7 space-y-6">
                    <div className="text-[10px] font-bold uppercase p-3 border-2 border-slate-800 bg-slate-50 italic">
                        TOTAL AMOUNT IN WORDS: RUPEES FOUR THOUSAND TWO HUNDRED TWENTY ONLY.
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="border border-slate-300 p-4 space-y-3 rounded-sm bg-slate-50/50">
                            <h3 className="text-[10px] font-bold border-b border-slate-300 pb-2 uppercase tracking-wider">Our Bank Details</h3>
                            <div className="text-[10px] space-y-1">
                                <p>A/c Name: <span className="font-bold uppercase">{client.bankDetails?.accountName || 'Fresh Link Agro'}</span></p>
                                <p>Bank: Bank of India, Saharkar Nagar</p>
                                <p>Current A/c: 051320110000832</p>
                                <p>IFSC Code: BKID0000513</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center border border-slate-300 rounded-sm p-2 bg-white print:hidden">
                            <p className="text-[9px] font-bold mb-2">Scan & Pay via UPI</p>
                            <Image src={qrCodeUrl} alt="UPI QR" width={90} height={90} className="border p-1" />
                        </div>
                    </div>

                    <p className="text-[8px] text-muted-foreground italic leading-tight border-t pt-4">
                        Certificate: We hereby certify that our registration certificate under the CGST Rules, 2017 is in force on the date of this transaction. The transaction covered by this tax invoice is made by us & it shall be accounted for in the turnover of sales while filing of return. Any tax payable has been or shall be paid.
                    </p>
                </div>

                <div className="col-span-5 space-y-4">
                    <div className="border-2 border-slate-800 p-4 space-y-2 text-xs font-bold bg-slate-50 shadow-sm">
                        <div className="flex justify-between"><span>Gross Amount</span><span>{totals.gross.toFixed(2)}</span></div>
                        {totals.varai > 0 && <div className="flex justify-between text-muted-foreground font-normal"><span>Varai Charges</span><span>{totals.varai.toFixed(2)}</span></div>}
                        {totals.lul > 0 && <div className="flex justify-between text-muted-foreground font-normal"><span>L/UL Charges</span><span>{totals.lul.toFixed(2)}</span></div>}
                        <Separator className="bg-slate-400" />
                        <div className="flex justify-between text-primary"><span>TAXABLE AMOUNT</span><span>{totals.taxable.toFixed(2)}</span></div>
                        <div className="flex justify-between font-normal text-muted-foreground"><span>CGST @ 9.00%</span><span>{(totals.tax / 2).toFixed(2)}</span></div>
                        <div className="flex justify-between font-normal text-muted-foreground"><span>SGST @ 9.00%</span><span>{(totals.tax / 2).toFixed(2)}</span></div>
                        <div className="flex justify-between font-normal"><span>Round Off</span><span>-0.34</span></div>
                        <Separator className="bg-slate-800 h-[2px]" />
                        <div className="flex justify-between text-xl font-headline text-slate-900 pt-1">
                            <span>TOTAL NET</span>
                            <span className="border-b-4 border-double border-slate-800">₹{totals.net.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pt-8 grid grid-cols-2 gap-4 items-end">
                        <div className="text-center">
                            <p className="text-[10px] font-bold mb-10 underline decoration-slate-300 underline-offset-4">Receiver's Sign</p>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[8px] font-bold uppercase mb-8">For Fresh Link Agro Cold Storage Pvt.Ltd</p>
                            <div className="border-t border-slate-800 pt-2">
                                <p className="text-[10px] font-bold">Director</p>
                                <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Authorised Signatory</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <p className="text-[7px] text-center mt-12 text-muted-foreground tracking-widest font-mono">
              CIN: U74999PN2017PTC170239 | Computer Generated Document | Backup Stored Daily
            </p>
        </CardFooter>
      </Card>
      
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .card { border: none !important; box-shadow: none !important; }
          header, nav { display: none !important; }
          @page { margin: 1cm; size: portrait; }
        }
      `}</style>
    </div>
  );
}
