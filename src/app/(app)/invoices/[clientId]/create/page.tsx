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
    // Check if we have a hardcoded invoice for this client in our mock data
    const historicalInvoice = invoices.find(inv => inv.clientId === clientId && inv.invoiceNumber === '02163');
    
    if (historicalInvoice && clientId === 'cust_03') {
        setInvoiceNo(historicalInvoice.invoiceNumber);
        setBillDate(historicalInvoice.date);
        setBillMonth('JANUARY');
        
        // Manual mapping for the Sheetal Invoice from image
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
          const amount = (item.inwardWeight / 1000) * rate; // Mock calculation
          
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
      <PageHeader title="Storage Bill" description="Generate professional storage invoice" className="print:hidden">
        <div className="flex gap-2">
            {user?.role === 'Admin' && (
              <Button variant="outline" onClick={handlePrint}>
                <Download className="mr-2 h-4 w-4"/> Download PDF
              </Button>
            )}
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Bill</Button>
        </div>
      </PageHeader>
      
      <Card className="max-w-5xl mx-auto border-2 shadow-none print:border-none print:w-full">
        <CardHeader className="p-8 space-y-6">
          <div className="flex justify-between items-start border-b-2 pb-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold font-headline text-slate-800">FRESH LINK AGRO COLD STORAGE PVT. LTD.</h1>
              <div className="text-[10px] text-muted-foreground leading-tight">
                <p>Off. : Office No. 8, Mate Chambers, Mukund Nagar, Pune - 411037</p>
                <p>Add : Gat No. 319, Gaud Dara Road, Khed Shivapur, Tal. Haveli, Dist. Pune - 412205</p>
                <p>GSTIN : 27AADCF0847N1ZC</p>
                <p>MOBILE # : +91 9699833995 Mansoor Shaikh, +91 9096390079 Abhijit</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <div className="w-16 h-16 relative">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-green-600 opacity-50"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
              </div>
              <p className="text-sm font-bold text-green-700 font-headline">Fresh Link</p>
            </div>
          </div>

          <div className="flex justify-center">
             <span className="border-2 border-slate-800 px-8 py-1 font-bold text-sm rounded-full">GST INVOICE</span>
          </div>

          <div className="flex justify-between text-sm">
            <div className="space-y-1">
              <p><span className="font-semibold">Customer Name : </span> {client.name}</p>
              <p><span className="font-semibold">GST No : </span> 27ACHPW3353P1ZT</p>
            </div>
            <div className="text-right space-y-1">
              <p><span className="font-semibold">Bill No : </span> {invoiceNo}</p>
              <p><span className="font-semibold">Bill Month : </span> {billMonth}</p>
              <p><span className="font-semibold">Bill Date : </span> {format(billDate, 'dd.MM.yyyy')}</p>
              <p><span className="font-semibold">S.A.C. : </span> 996721</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 border-t-2 border-b-2">
          <Table className="border-collapse">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-b-2 border-slate-300">
                <TableHead className="border-r h-12 text-[10px] px-1 font-bold text-slate-800">Inw#</TableHead>
                <TableHead className="border-r text-[10px] px-1 font-bold text-slate-800">Inw Date</TableHead>
                <TableHead className="border-r text-[10px] px-1 font-bold text-slate-800">Item Description</TableHead>
                <TableHead className="border-r text-center p-0 font-bold text-slate-800">
                  <div className="border-b px-1 py-1 text-[10px]">Opening</div>
                  <div className="flex text-[9px]">
                    <span className="w-1/2 border-r">Qty</span>
                    <span className="w-1/2">weight</span>
                  </div>
                </TableHead>
                <TableHead className="border-r text-[10px] px-1 font-bold text-slate-800">Rate MT</TableHead>
                <TableHead className="border-r text-center p-0 font-bold text-slate-800">
                   <div className="border-b px-1 py-1 text-[10px]">Issues</div>
                   <div className="flex text-[9px]">
                    <span className="w-1/2 border-r">Qty</span>
                    <span className="w-1/2">weight</span>
                  </div>
                </TableHead>
                <TableHead className="border-r text-center p-0 font-bold text-slate-800">
                   <div className="border-b px-1 py-1 text-[10px]">Out Detail(s)</div>
                   <div className="flex text-[9px]">
                    <span className="w-1/2 border-r">Date</span>
                    <span className="w-1/2">Qty</span>
                  </div>
                </TableHead>
                <TableHead className="border-r text-center p-0 font-bold text-slate-800">
                   <div className="border-b px-1 py-1 text-[10px]">Closing</div>
                   <div className="flex text-[9px]">
                    <span className="w-1/2 border-r">Qty</span>
                    <span className="w-1/2">weight</span>
                  </div>
                </TableHead>
                <TableHead className="text-[10px] px-1 font-bold text-slate-800 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storageItems.map((item, index) => (
                <TableRow key={index} className="hover:bg-transparent border-b border-slate-200">
                  <TableCell className="border-r text-[10px] py-1 px-1 font-mono">{item.inwNo}</TableCell>
                  <TableCell className="border-r text-[10px] py-1 px-1">{item.inwDate}</TableCell>
                  <TableCell className="border-r text-[10px] py-1 px-1">{item.description}</TableCell>
                  <TableCell className="border-r p-0 text-[10px] text-center">
                    <div className="flex h-full">
                      <span className="w-1/2 border-r py-1">{item.opening.qty}</span>
                      <span className="w-1/2 py-1">{item.opening.weight}</span>
                    </div>
                  </TableCell>
                  <TableCell className="border-r text-[10px] py-1 px-1 text-center font-mono">{item.rateMT.toFixed(2)}</TableCell>
                  <TableCell className="border-r p-0 text-[10px] text-center">
                    <div className="flex h-full">
                      <span className="w-1/2 border-r py-1">{item.issues.qty || ''}</span>
                      <span className="w-1/2 py-1">{item.issues.weight || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="border-r p-0 text-[10px] text-center bg-slate-50/50">
                    {item.outDetails.map((od, i) => (
                      <div key={i} className="flex border-b last:border-0 h-6 items-center">
                        <span className="w-1/2 border-r text-[8px]">{od.date}</span>
                        <span className="w-1/2">{od.qty}</span>
                      </div>
                    ))}
                    {item.outDetails.length === 0 && <div className="h-6" />}
                  </TableCell>
                  <TableCell className="border-r p-0 text-[10px] text-center">
                    <div className="flex h-full">
                      <span className="w-1/2 border-r py-1">{item.closing.qty || ''}</span>
                      <span className="w-1/2 py-1">{item.closing.weight || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] py-1 px-1 text-right font-bold">{item.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-800">
                <TableCell colSpan={3} className="text-right border-r">TOTAL</TableCell>
                <TableCell className="border-r p-0 text-[9px] text-center">
                    <div className="flex">
                        <span className="w-1/2 border-r py-1">{totalOpeningQty}</span>
                        <span className="w-1/2 py-1">{totalOpeningWt}</span>
                    </div>
                </TableCell>
                <TableCell className="border-r" />
                <TableCell className="border-r p-0 text-[9px] text-center">
                    <div className="flex">
                        <span className="w-1/2 border-r py-1">{totalIssuesQty}</span>
                        <span className="w-1/2 py-1">{totalIssuesWt.toFixed(2)}</span>
                    </div>
                </TableCell>
                <TableCell className="border-r p-0 text-[9px] text-center">
                    <div className="flex">
                        <span className="w-1/2 border-r" />
                        <span className="w-1/2 py-1">{totalIssuesQty}</span>
                    </div>
                </TableCell>
                <TableCell className="border-r p-0 text-[9px] text-center">
                    <div className="flex">
                        <span className="w-1/2 border-r py-1">{totalClosingQty}</span>
                        <span className="w-1/2 py-1">{totalClosingWt}</span>
                    </div>
                </TableCell>
                <TableCell className="text-right font-bold">{totals.gross.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="p-8 block">
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8 space-y-6">
                    <div className="text-[11px] font-bold uppercase p-2 border border-slate-400 bg-slate-50">
                        RUPEES FOUR THOUSAND TWO HUNDRED TWENTY ONLY.
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="border p-3 space-y-2 rounded-md bg-slate-50/50">
                            <h3 className="text-[10px] font-bold border-b pb-1">BANK DETAILS</h3>
                            <div className="text-[10px] space-y-0.5">
                                <p>Name: <span className="font-bold">Fresh link Agro Cold Storage Pvt.Ltd</span></p>
                                <p>Bank: Bank of India, Saharkar Nagar C&P Branch</p>
                                <p>Current A/c no.: 051320110000832</p>
                                <p>IFSC Code: BKID0000513</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center border rounded-md p-2 bg-white print:hidden">
                            <p className="text-[9px] font-bold mb-1">Scan to Pay UPI</p>
                            <Image src={qrCodeUrl} alt="UPI QR" width={80} height={80} />
                        </div>
                    </div>

                    <p className="text-[8px] text-muted-foreground italic">
                        We hereby certify that our registration certificate under the Central Goods & Service Tax (CGST) Rules, 2017 is in force on the date of this transaction and that the transaction of sale covered by this tax invoice is made by us & it shall be account for in the turnover of sales while filling of return & due tax if any, payable on the sale has been paid or shall be paid.
                    </p>
                </div>

                <div className="col-span-4 space-y-2">
                    <div className="border-2 border-slate-800 p-2 space-y-1 text-xs font-bold">
                        <div className="flex justify-between"><span>Gross Amt</span><span>{totals.gross.toFixed(2)}</span></div>
                        {totals.varai > 0 && <div className="flex justify-between"><span>Varai</span><span>{totals.varai.toFixed(2)}</span></div>}
                        {totals.lul > 0 && <div className="flex justify-between"><span>L/UL</span><span>{totals.lul.toFixed(2)}</span></div>}
                        <Separator className="bg-slate-400" />
                        <div className="flex justify-between"><span>TAXABLE AMT</span><span>{totals.taxable.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>CGST @ 9.00%</span><span>{(totals.tax / 2).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>SGST @ 9.00%</span><span>{(totals.tax / 2).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Round</span><span>-0.34</span></div>
                        <Separator className="bg-slate-800" />
                        <div className="flex justify-between text-lg text-primary"><span>Net Amount</span><span>{totals.net.toFixed(2)}</span></div>
                    </div>

                    <div className="pt-10 flex justify-between items-end">
                        <div className="text-center">
                            <p className="text-[10px] font-bold mb-10">Manager</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold mb-8">FRESH LINK AGRO COLD STORAGE PVT.LTD</p>
                            <p className="text-[10px] font-bold mb-2">Director</p>
                            <p className="text-[9px] text-muted-foreground">Authorised Signatory</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <p className="text-[8px] text-center mt-10 text-muted-foreground border-t pt-4">
              CIN: - U74999PN2017PTC170239 | Registered in India
            </p>
        </CardFooter>
      </Card>
      
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .card { border: none !important; box-shadow: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
