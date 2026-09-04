'use client';

export const dynamic = 'force-dynamic';

/**
 * STRUCTURAL CHANGE (B2) — Consolidated Inward/Outward Register page.
 *
 * Replaces two near-identical filter pages (/printing/inward-register and
 * /printing/outward-register) with a single page that switches the data
 * source and print URL via a tab toggle.
 *
 * The print pages at /printing/inward-register/print and
 * /printing/outward-register/print are NOT changed — they are called
 * conditionally based on the active tab, exactly as before.
 *
 * STRUCTURAL CHANGE (B1) — Preview table.
 *
 * A parallel Firestore read (same collection + filters as the print page)
 * populates a compact preview table before the user hits Print.
 * NOTE: This is a separate query, not the exact same fetch the print page
 * uses. If data changes between the preview fetch and the print navigation
 * the counts may differ by those new records. Flag for review.
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Filter, Loader2, X } from 'lucide-react';

import { db } from '@/lib/firebase';
import { clientsService } from '@/lib/firestore';
import type { Client } from '@/lib/types';
import type { InwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';
import { useClientAutocomplete } from '@/hooks/use-client-autocomplete';

type RegisterType = 'inward' | 'outward';

type InwardPreviewRow = {
  no: string;
  date: string;
  customer: string;
  item: string;
  qty: number;
  weight: number;
};

type OutwardPreviewRow = {
  no: string;
  date: string;
  customer: string;
  item: string;
  qty: number;
  weight: number;
};

function parseNum(v: unknown) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function isWithinRange(dateIso: string, fromIso: string, toIso: string) {
  if (!fromIso && !toIso) return true;
  if (fromIso && dateIso < fromIso) return false;
  if (toIso && dateIso > toIso) return false;
  return true;
}

function buildPrintUrl(type: RegisterType, params: { customerId?: string; from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params.customerId) search.set('customerId', params.customerId);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const qs = search.toString();
  const base = type === 'inward'
    ? '/printing/inward-register/print'
    : '/printing/outward-register/print';
  return `${base}${qs ? `?${qs}` : ''}`;
}

export default function RegisterFilterPage() {
  const router = useRouter();

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [registerType, setRegisterType] = useState<RegisterType>('inward');
  const [clients, setClients] = useState<Client[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(todayIso);

  const clientAC = useClientAutocomplete({ clients });
  const customerId = clientAC.selectedClient?.id ?? '';
  const selectedCustomer = clientAC.selectedClient;

  // Preview state
  const [previewRows, setPreviewRows] = useState<(InwardPreviewRow | OutwardPreviewRow)[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFetched, setPreviewFetched] = useState(false);

  useEffect(() => {
    clientsService.getAll().then(setClients).catch(console.error);
  }, []);

  // Reset preview when filters or tab change
  useEffect(() => {
    setPreviewRows([]);
    setPreviewFetched(false);
  }, [registerType, customerId, fromDate, toDate]);



  const handleClear = useCallback(() => {
    clientAC.clearSelection();
    setFromDate('');
    setToDate(todayIso);
    setPreviewRows([]);
    setPreviewFetched(false);
  }, [clientAC, todayIso]);

  // B1: Parallel preview fetch — same filters as print, separate query.
  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewFetched(false);
    try {
      if (registerType === 'inward') {
        const q = customerId
          ? query(collection(db, 'inwardVouchers'), where('clientId', '==', customerId), orderBy('date', 'asc'))
          : query(collection(db, 'inwardVouchers'), orderBy('date', 'asc'));
        const snap = await getDocs(q);
        const vouchers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));
        const rows: InwardPreviewRow[] = vouchers
          .filter((v) => isWithinRange(v.date, fromDate, toDate))
          .flatMap((v) =>
            v.items.map((item) => ({
              no: v.inwardNo,
              date: v.date,
              customer: v.clientName,
              item: item.itemName,
              qty: parseNum(item.bags),
              weight: parseNum(item.totalWeight),
            }))
          );
        setPreviewRows(rows);
      } else {
        const q = customerId
          ? query(collection(db, 'outwardVouchers'), where('clientId', '==', customerId), orderBy('date', 'asc'))
          : query(collection(db, 'outwardVouchers'), orderBy('date', 'asc'));
        const snap = await getDocs(q);
        const vouchers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
        const rows: OutwardPreviewRow[] = vouchers
          .filter((v) => isWithinRange(v.date, fromDate, toDate))
          .flatMap((v) =>
            v.items.map((item) => ({
              no: v.outwardNo,
              date: v.date,
              customer: v.clientName,
              item: item.itemName,
              qty: parseNum(item.qty),
              weight: parseNum(item.totalWeight),
            }))
          );
        setPreviewRows(rows);
      }
    } catch (err) {
      console.error('Preview fetch failed:', err);
    } finally {
      setPreviewLoading(false);
      setPreviewFetched(true);
    }
  }, [registerType, customerId, fromDate, toDate]);

  const handlePrint = useCallback(() => {
    router.push(buildPrintUrl(registerType, {
      customerId: customerId || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }));
  }, [registerType, customerId, fromDate, toDate, router]);

  const previewTotals = useMemo(() => ({
    qty: previewRows.reduce((s, r) => s + r.qty, 0),
    weight: previewRows.reduce((s, r) => s + r.weight, 0),
  }), [previewRows]);

  const isInward = registerType === 'inward';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register"
        description={`Filter and print ${isInward ? 'inward' : 'outward'} register from saved vouchers.`}
      />

      {/* Tab toggle — switches data source and print template */}
      <div className="max-w-4xl mx-auto">
        <Tabs value={registerType} onValueChange={(v) => setRegisterType(v as RegisterType)}>
          <TabsList className="w-full max-w-xs tab-switcher">
            <TabsTrigger value="inward" className="flex-1">Inward Register</TabsTrigger>
            <TabsTrigger value="outward" className="flex-1">Outward Register</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters card */}
      <Card className="max-w-4xl mx-auto border shadow-sm">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
          <CardDescription className="text-lg font-semibold text-black">
            {isInward ? 'Inward Register' : 'Outward Register'}
          </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* Customer autocomplete */}
            <div className="md:col-span-6">
              <Label>Customer Name</Label>
              <div className="relative">
                <Input
                  placeholder="Type customer name..."
                  value={clientAC.inputValue}
                  onChange={clientAC.handleInputChange}
                  onKeyDown={clientAC.handleKeyDown}
                  onFocus={clientAC.handleFocus}
                  onBlur={clientAC.handleBlur}
                />
                {clientAC.isOpen && clientAC.suggestions.length > 0 && (
                  <div ref={clientAC.listRef} className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow">
                    {clientAC.suggestions.map((c, index) => (
                      <div key={c.id} {...clientAC.getSuggestionProps(c, index)}>
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="mt-1 text-xs text-muted-foreground">Selected: {selectedCustomer.name}</div>
              )}
            </div>

            {/* From Date */}
            <div className="md:col-span-3">
              <Label>From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="date-input-teal"
              />
            </div>

            {/* To Date */}
            <div className="md:col-span-3">
              <Label>To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="date-input-teal"
              />
            </div>
          </div>

          {/* Preview + Print actions */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
              {previewLoading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Filter className="mr-2 h-4 w-4" />}
              Preview
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* B1: Preview results — parallel query, flagged as not guaranteed 1:1 with print */}
      {previewFetched && (
        <Card className="max-w-4xl mx-auto border shadow-sm">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {previewRows.length} {previewRows.length === 1 ? 'entry' : 'entries'} found
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Preview — print will include these records
              </span>
            </div>
          </CardHeader>
          {previewRows.length > 0 && (
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{isInward ? 'Inw No' : 'Out No'}</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Customer</TableHead>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r, idx) => (
                      <TableRow key={`${r.no}:${idx}`} className="table-row-hover text-xs">
                        <TableCell className="font-mono py-1.5">{r.no}</TableCell>
                        <TableCell className="py-1.5">{format(new Date(r.date), 'dd.MM.yyyy')}</TableCell>
                        <TableCell className="py-1.5 uppercase">{r.customer}</TableCell>
                        <TableCell className="py-1.5 uppercase">{r.item}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono">{r.qty}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono">{r.weight.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/50 text-xs">
                      <TableCell colSpan={4} className="py-1.5 text-right">Total</TableCell>
                      <TableCell className="py-1.5 text-right font-mono">{previewTotals.qty}</TableCell>
                      <TableCell className="py-1.5 text-right font-mono">{previewTotals.weight.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
