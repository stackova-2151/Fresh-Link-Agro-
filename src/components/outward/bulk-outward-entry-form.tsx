'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import type { Chamber, Client, RentalItem, User } from '@/lib/types';

export type OutwardVoucherItem = {
  id: string;
  itemName: string;
  brand: string;
  batch: string;
  chamberId: string;
  qty: number | '';
  bags: number | '';
  totalWeight: number;
  inwardNumber: string;
  expDate: string;
  sourceRentalItemId: string;
};

export type OutwardVoucher = {
  id: string;
  outwardNo: string;
  clientId: string;
  clientName: string;
  date: string;
  gatePassNo: string;
  vehicleNo: string;
  driverName: string;
  mobile: string;
  enteredBy: string;
  notes: string;
  items: OutwardVoucherItem[];
};

export type OutwardConsoleMode = 'new' | 'edit' | 'clientView';

type Props = {
  clients: Client[];
  chambers: Chamber[];
  user: User | null;
  existingItems: RentalItem[];
  vouchers: OutwardVoucher[];
  onUpsert: (result: { mode: OutwardConsoleMode; voucher: OutwardVoucher }) => void;
  onVoucherNoChange?: (outwardNo: string) => void;
};

type RowField = keyof Omit<OutwardVoucherItem, 'id' | 'totalWeight' | 'expDate' | 'sourceRentalItemId'>;

const GRID_FIELDS: RowField[] = ['itemName', 'brand', 'batch', 'chamberId', 'qty', 'bags', 'inwardNumber'];

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function createEmptyRow(): OutwardVoucherItem {
  return {
    id: createId('row'),
    itemName: '',
    brand: '',
    batch: '',
    chamberId: '',
    qty: '',
    bags: '',
    totalWeight: 0,
    inwardNumber: '',
    expDate: '',
    sourceRentalItemId: '',
  };
}

function isRowBlank(row: OutwardVoucherItem) {
  return (
    !row.itemName &&
    !row.brand &&
    !row.batch &&
    !row.chamberId &&
    (row.qty === '' || row.qty === 0) &&
    (row.bags === '' || row.bags === 0) &&
    !row.inwardNumber
  );
}

function parseOutwardSeq(outwardNo: string) {
  const match = /^OUT-(\d+)$/.exec(outwardNo.trim().toUpperCase());
  if (!match) return null;
  const seq = Number(match[1]);
  return Number.isFinite(seq) ? seq : null;
}

function formatOutwardNo(seq: number) {
  return `OUT-${String(seq).padStart(3, '0')}`;
}

function generateNextOutwardNo(vouchers: OutwardVoucher[]) {
  const maxFromVouchers = vouchers
    .map((v) => parseOutwardSeq(v.outwardNo))
    .filter((n): n is number => typeof n === 'number')
    .reduce((max, n) => Math.max(max, n), 0);

  return formatOutwardNo(maxFromVouchers + 1);
}

function toIsoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseNumberValue(value: string) {
  if (value === '') return '' as const;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : ('' as const);
}

function calcDerivedBagWeight(item: RentalItem) {
  if (!item.inwardQuantity) return 0;
  return item.inwardWeight / item.inwardQuantity;
}

export function BulkOutwardEntryForm({
  clients,
  chambers,
  user,
  existingItems,
  vouchers,
  onUpsert,
  onVoucherNoChange,
}: Props) {
  const { toast } = useToast();

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const [mode, setMode] = useState<OutwardConsoleMode>('new');
  const [voucherDate, setVoucherDate] = useState<string>(todayIso);
  const [outwardNo, setOutwardNo] = useState<string>(() => generateNextOutwardNo(vouchers));

  const [clientId, setClientId] = useState<string>('');
  const [clientInput, setClientInput] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [clientHighlightIndex, setClientHighlightIndex] = useState(0);

  const [gatePassNo, setGatePassNo] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [clientViewRows, setClientViewRows] = useState<Array<OutwardVoucherItem & { outwardNo: string; date: string }>>([]);

  const [rows, setRows] = useState<OutwardVoucherItem[]>(() => [createEmptyRow()]);

  useEffect(() => {
    onVoucherNoChange?.(outwardNo);
  }, [onVoucherNoChange, outwardNo]);

  const vouchersByOutwardNo = useMemo(() => {
    const map = new Map<string, OutwardVoucher>();
    vouchers.forEach((v) => map.set(v.outwardNo.toUpperCase(), v));
    return map;
  }, [vouchers]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clientId, clients]);

  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setCellRef = useCallback((key: string, el: HTMLInputElement | null) => {
    cellRefs.current[key] = el;
  }, []);

  const focusCell = useCallback(
    (rowIndex: number, field: RowField) => {
      const row = rows[rowIndex];
      if (!row) return;
      const key = `${row.id}:${field}`;
      const el = cellRefs.current[key];
      el?.focus();
      el?.select?.();
    },
    [rows]
  );

  const grandTotalWeight = useMemo(() => rows.reduce((sum, r) => sum + (r.totalWeight || 0), 0), [rows]);

  const filledRowsCount = useMemo(() => rows.filter((r) => !isRowBlank(r)).length, [rows]);

  const tryAdvanceOnEnter = useCallback(
    (rowIndex: number, field: RowField) => {
      const fieldIndex = GRID_FIELDS.indexOf(field);
      if (fieldIndex === -1) return;

      const isLastField = fieldIndex === GRID_FIELDS.length - 1;
      if (!isLastField) {
        focusCell(rowIndex, GRID_FIELDS[fieldIndex + 1]);
        return;
      }

      const nextRowIndex = rowIndex + 1;
      const hasNextRow = Boolean(rows[nextRowIndex]);
      if (!hasNextRow) {
        setRows((prev) => [...prev, createEmptyRow()]);
        setTimeout(() => focusCell(nextRowIndex, 'itemName'), 0);
        return;
      }

      focusCell(nextRowIndex, 'itemName');
    },
    [focusCell, rows]
  );

  const handleClientInputChange = useCallback(
    (value: string) => {
      setClientInput(value);
      setClientId('');

      if (!value.trim()) {
        setFilteredClients([]);
        setShowClientSuggestions(false);
        setClientHighlightIndex(0);
        return;
      }

      const results = clients.filter((c) => c.name.toLowerCase().includes(value.toLowerCase()));
      setFilteredClients(results);
      setShowClientSuggestions(true);
      setClientHighlightIndex(0);
    },
    [clients]
  );

  const handleClientSelect = useCallback((client: Client) => {
    setClientId(client.id);
    setClientInput(client.name);
    setShowClientSuggestions(false);
    setFilteredClients([]);
    setClientHighlightIndex(0);
  }, []);

  const triggerClientView = useCallback(
    (client: Client) => {
      const clientVouchers = vouchers.filter((v) => v.clientId === client.id);
      const flattened = clientVouchers.flatMap((v) => v.items.map((item) => ({ outwardNo: v.outwardNo, date: v.date, ...item })));
      setClientViewRows(flattened);
      setMode('clientView');
    },
    [vouchers]
  );

  const handleClientKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        if (!showClientSuggestions || filteredClients.length === 0) return;
        e.preventDefault();
        setClientHighlightIndex((prev) => (prev + 1) % filteredClients.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        if (!showClientSuggestions || filteredClients.length === 0) return;
        e.preventDefault();
        setClientHighlightIndex((prev) => (prev === 0 ? filteredClients.length - 1 : prev - 1));
        return;
      }

      if (e.key === 'Escape') {
        setShowClientSuggestions(false);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();

        if (showClientSuggestions && filteredClients.length > 0) {
          const selected = filteredClients[clientHighlightIndex];
          if (selected) handleClientSelect(selected);
          return;
        }

        if (selectedClient) {
          triggerClientView(selectedClient);
        }
      }
    },
    [clientHighlightIndex, filteredClients, handleClientSelect, selectedClient, showClientSuggestions, triggerClientView]
  );

  const loadVoucher = useCallback(
    (voucher: OutwardVoucher) => {
      setMode('edit');
      setClientViewRows([]);
      setShowClientSuggestions(false);

      setOutwardNo(voucher.outwardNo);
      setVoucherDate(voucher.date);
      setClientId(voucher.clientId);
      setClientInput(voucher.clientName);
      setFilteredClients([]);
      setClientHighlightIndex(0);

      setGatePassNo(voucher.gatePassNo);
      setVehicleNo(voucher.vehicleNo);
      setDriverName(voucher.driverName);
      setMobile(voucher.mobile);
      setNotes(voucher.notes);

      setRows(voucher.items.length ? voucher.items.map((i) => ({ ...i })) : [createEmptyRow()]);
      setTimeout(() => focusCell(0, 'itemName'), 0);
    },
    [focusCell]
  );

  const clearForNewEntry = useCallback(
    (nextOutwardNo?: string) => {
      setMode('new');
      setVoucherDate(todayIso);
      setOutwardNo(nextOutwardNo ?? generateNextOutwardNo(vouchers));

      setClientId('');
      setClientInput('');
      setFilteredClients([]);
      setShowClientSuggestions(false);
      setClientHighlightIndex(0);

      setGatePassNo('');
      setVehicleNo('');
      setDriverName('');
      setMobile('');
      setNotes('');

      setRows([createEmptyRow()]);
      setClientViewRows([]);
    },
    [todayIso, vouchers]
  );

  const handleOutwardLookup = useCallback(() => {
    const key = outwardNo.trim().toUpperCase();

    setClientViewRows([]);
    setShowClientSuggestions(false);

    const found = vouchersByOutwardNo.get(key);
    if (found) {
      loadVoucher(found);
      return;
    }

    clearForNewEntry(key);
  }, [clearForNewEntry, loadVoucher, outwardNo, vouchersByOutwardNo]);

  const getFefoMatches = useCallback(
    (row: OutwardVoucherItem) => {
      if (!clientId) return [];
      const itemName = row.itemName.trim().toLowerCase();
      const brand = row.brand.trim().toLowerCase();
      if (!itemName || !brand) return [];

      const matches = existingItems
        .filter((i) => {
          if (i.clientId !== clientId) return false;
          if (i.quantityAvailable <= 0) return false;
          if (i.name.trim().toLowerCase() !== itemName) return false;
          if (i.brand.trim().toLowerCase() !== brand) return false;
          return true;
        })
        .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

      return matches;
    },
    [clientId, existingItems]
  );

  const applyInwardSelectionToRow = useCallback((rowIndex: number, item: RentalItem) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[rowIndex] };

      row.inwardNumber = item.inwardNumber;
      row.expDate = toIsoDate(item.expiryDate);
      row.sourceRentalItemId = item.id;

      const bags = typeof row.bags === 'number' ? row.bags : 0;
      const bagWeight = calcDerivedBagWeight(item);
      row.totalWeight = bags > 0 && bagWeight > 0 ? bags * bagWeight : 0;

      next[rowIndex] = row;
      return next;
    });
  }, []);

  const handleRowChange = useCallback(
    (rowIndex: number, field: RowField, value: string) => {
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[rowIndex] };

        if (field === 'qty' || field === 'bags') {
          (row as any)[field] = parseNumberValue(value);
        } else if (field === 'inwardNumber') {
          row.inwardNumber = value;
        } else {
          (row as any)[field] = value;
        }

        const selectedItem = row.sourceRentalItemId ? existingItems.find((i) => i.id === row.sourceRentalItemId) : null;
        if (selectedItem) {
          const bags = typeof row.bags === 'number' ? row.bags : 0;
          const bagWeight = calcDerivedBagWeight(selectedItem);
          row.totalWeight = bags > 0 && bagWeight > 0 ? bags * bagWeight : 0;
          row.expDate = toIsoDate(selectedItem.expiryDate);
          row.inwardNumber = selectedItem.inwardNumber;
        } else {
          row.totalWeight = 0;
          row.expDate = '';
        }

        next[rowIndex] = row;
        return next;
      });
    },
    [existingItems]
  );

  const validateRows = useCallback(() => {
    if (!clientId) return { ok: false as const, message: 'Client is required', rowIndex: null as number | null };

    const nonBlank = rows.filter((r) => !isRowBlank(r));
    if (nonBlank.length === 0) return { ok: false as const, message: 'Add at least 1 item row before saving', rowIndex: null as number | null };

    for (const r of nonBlank) {
      const idx = rows.findIndex((x) => x.id === r.id);
      if (!r.itemName.trim()) return { ok: false as const, message: 'Item Name is required', rowIndex: idx };
      if (!r.brand.trim()) return { ok: false as const, message: 'Brand is required', rowIndex: idx };
      if (!r.chamberId) return { ok: false as const, message: 'Chamber is required', rowIndex: idx };
      if (typeof r.qty !== 'number' || r.qty <= 0) return { ok: false as const, message: 'Qty must be > 0', rowIndex: idx };
      if (typeof r.bags !== 'number' || r.bags <= 0) return { ok: false as const, message: 'Bags must be > 0', rowIndex: idx };
      if (!r.sourceRentalItemId) return { ok: false as const, message: 'Select Inward No from suggestions', rowIndex: idx };

      const stock = existingItems.find((i) => i.id === r.sourceRentalItemId);
      if (!stock) return { ok: false as const, message: 'Selected inward stock not found', rowIndex: idx };

      if (r.bags > stock.quantityAvailable) {
        return { ok: false as const, message: `Bags exceeds available (${stock.quantityAvailable})`, rowIndex: idx };
      }
    }

    return { ok: true as const };
  }, [clientId, existingItems, rows]);

  const handleSave = useCallback(() => {
    const parsed = parseOutwardSeq(outwardNo);
    if (!parsed) {
      toast({ variant: 'destructive', title: 'Invalid Outward No format', description: 'Use OUT-001' });
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      toast({ variant: 'destructive', title: 'Invalid client selected' });
      return;
    }

    const validation = validateRows();
    if (!validation.ok) {
      toast({ variant: 'destructive', title: validation.message });
      if (validation.rowIndex !== null) focusCell(validation.rowIndex, 'itemName');
      return;
    }

    const enteredBy = user?.name ?? 'Unknown';

    const nonBlankRows = rows.filter((r) => !isRowBlank(r));

    const existingVoucher = vouchersByOutwardNo.get(outwardNo.trim().toUpperCase());
    const nextMode: OutwardConsoleMode = existingVoucher ? 'edit' : 'new';

    const voucherId = existingVoucher?.id ?? createId('outward_voucher');
    const voucher: OutwardVoucher = {
      id: voucherId,
      outwardNo,
      clientId: client.id,
      clientName: client.name,
      date: voucherDate,
      gatePassNo,
      vehicleNo,
      driverName,
      mobile,
      enteredBy,
      notes,
      items: nonBlankRows,
    };

    onUpsert({ mode: nextMode, voucher });

    toast({
      title: nextMode === 'edit' ? 'Outward voucher updated' : 'Outward voucher saved',
      description: `${voucher.outwardNo} • ${client.name} • ${nonBlankRows.length} rows • ${grandTotalWeight.toFixed(2)} kg`,
    });

    if (nextMode === 'new') {
      const nextOutwardNo = generateNextOutwardNo([...vouchers, voucher]);
      clearForNewEntry(nextOutwardNo);
      return;
    }

    setMode('edit');
  }, [
    clearForNewEntry,
    clientId,
    clients,
    driverName,
    focusCell,
    gatePassNo,
    grandTotalWeight,
    mobile,
    notes,
    onUpsert,
    outwardNo,
    rows,
    toast,
    user?.name,
    validateRows,
    vehicleNo,
    voucherDate,
    vouchers,
    vouchersByOutwardNo,
  ]);

  const saveButtonLabel = mode === 'edit' ? 'Update Entry' : 'Save Entry';

  const [activeInwardRowId, setActiveInwardRowId] = useState<string | null>(null);
  const [showInwardSuggestions, setShowInwardSuggestions] = useState(false);
  const [inwardHighlightIndex, setInwardHighlightIndex] = useState(0);

  const activeInwardMatches = useMemo(() => {
    if (!activeInwardRowId) return [];
    const idx = rows.findIndex((r) => r.id === activeInwardRowId);
    const row = rows[idx];
    if (!row) return [];
    return getFefoMatches(row);
  }, [activeInwardRowId, getFefoMatches, rows]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Outward Entry</div>
            {mode === 'edit' && <div className="text-xs text-muted-foreground">Editing: {outwardNo}</div>}
            {mode === 'clientView' && (
              <div className="text-xs text-muted-foreground">Showing results for: {selectedClient?.name ?? 'Client'}</div>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{format(new Date(voucherDate), 'dd/MM/yyyy')}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-2">
            <Label>Outward No</Label>
            <Input
              value={outwardNo}
              onChange={(e) => {
                const next = e.target.value.toUpperCase();
                setOutwardNo(next);
                setMode(vouchersByOutwardNo.has(next.trim().toUpperCase()) ? 'edit' : 'new');
                setClientViewRows([]);
                setShowClientSuggestions(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleOutwardLookup();
                }
              }}
              className="font-mono"
            />
          </div>

          <div className="md:col-span-4">
            <Label>Client Name</Label>
            <div className="relative">
              <Input
                placeholder="Type client name..."
                value={clientInput}
                onChange={(e) => handleClientInputChange(e.target.value)}
                onKeyDown={handleClientKeyDown}
                onFocus={() => {
                  if (filteredClients.length > 0) setShowClientSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowClientSuggestions(false), 0);
                }}
              />

              {showClientSuggestions && filteredClients.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow">
                  {filteredClients.map((client, index) => (
                    <div
                      key={client.id}
                      className={`cursor-pointer px-3 py-2 text-sm ${index === clientHighlightIndex ? 'bg-muted' : ''}`}
                      onMouseDown={() => handleClientSelect(client)}
                      onMouseEnter={() => setClientHighlightIndex(index)}
                    >
                      {client.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Date</Label>
            <Input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Gate Pass No</Label>
            <Input value={gatePassNo} onChange={(e) => setGatePassNo(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Vehicle No</Label>
            <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Driver Name</Label>
            <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Mobile No</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
        </div>

        {mode === 'clientView' ? (
          <div className="overflow-x-auto rounded-md border">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[110px]">Outward No</TableHead>
                  <TableHead className="w-[110px]">Inward No</TableHead>
                  <TableHead className="w-[220px]">Item Name</TableHead>
                  <TableHead className="w-[140px]">Qty</TableHead>
                  <TableHead className="w-[120px]">Bags</TableHead>
                  <TableHead className="w-[130px] text-right">Tot Wt</TableHead>
                  <TableHead className="w-[140px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientViewRows.map((row) => (
                  <TableRow key={`${row.outwardNo}:${row.id}`} className="hover:bg-transparent">
                    <TableCell className="font-mono text-xs">{row.outwardNo}</TableCell>
                    <TableCell className="font-mono text-xs">{row.inwardNumber}</TableCell>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell>{row.qty}</TableCell>
                    <TableCell>{row.bags}</TableCell>
                    <TableCell className="text-right">{row.totalWeight ? row.totalWeight.toFixed(2) : ''}</TableCell>
                    <TableCell>{row.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[220px]">Item Name</TableHead>
                  <TableHead className="w-[160px]">Brand</TableHead>
                  <TableHead className="w-[140px]">Batch</TableHead>
                  <TableHead className="w-[200px]">Chamber</TableHead>
                  <TableHead className="w-[90px] text-right">Qty</TableHead>
                  <TableHead className="w-[90px] text-right">Bags</TableHead>
                  <TableHead className="w-[120px] text-right">Tot Wt</TableHead>
                  <TableHead className="w-[140px]">Inward No</TableHead>
                  <TableHead className="w-[140px]">Exp Date</TableHead>
                  <TableHead className="w-[70px] text-right">Del</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const rowKey = row.id;

                  return (
                    <TableRow key={rowKey} className="hover:bg-transparent">
                      <TableCell className="p-1">
                        <Input
                          ref={(el) => setCellRef(`${rowKey}:itemName`, el)}
                          value={row.itemName}
                          onChange={(e) => handleRowChange(idx, 'itemName', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tryAdvanceOnEnter(idx, 'itemName');
                            }
                          }}
                          className="h-8"
                        />
                      </TableCell>

                      <TableCell className="p-1">
                        <Input
                          ref={(el) => setCellRef(`${rowKey}:brand`, el)}
                          value={row.brand}
                          onChange={(e) => handleRowChange(idx, 'brand', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tryAdvanceOnEnter(idx, 'brand');
                            }
                          }}
                          className="h-8"
                        />
                      </TableCell>

                      <TableCell className="p-1">
                        <Input
                          ref={(el) => setCellRef(`${rowKey}:batch`, el)}
                          value={row.batch}
                          onChange={(e) => handleRowChange(idx, 'batch', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tryAdvanceOnEnter(idx, 'batch');
                            }
                          }}
                          className="h-8"
                        />
                      </TableCell>

                      <TableCell className="p-1">
                        <Select value={row.chamberId} onValueChange={(val) => handleRowChange(idx, 'chamberId', val)}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {chambers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="p-1">
                        <Input
                          ref={(el) => setCellRef(`${rowKey}:qty`, el)}
                          inputMode="numeric"
                          value={row.qty}
                          onChange={(e) => handleRowChange(idx, 'qty', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tryAdvanceOnEnter(idx, 'qty');
                            }
                          }}
                          className="h-8 text-right"
                        />
                      </TableCell>

                      <TableCell className="p-1">
                        <Input
                          ref={(el) => setCellRef(`${rowKey}:bags`, el)}
                          inputMode="numeric"
                          value={row.bags}
                          onChange={(e) => handleRowChange(idx, 'bags', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tryAdvanceOnEnter(idx, 'bags');
                            }
                          }}
                          className="h-8 text-right"
                        />
                      </TableCell>

                      <TableCell className="p-1">
                        <Input value={row.totalWeight ? row.totalWeight.toFixed(2) : ''} readOnly className="h-8 text-right" />
                      </TableCell>

                      <TableCell className="p-1">
                        <div className="relative">
                          <Input
                            ref={(el) => setCellRef(`${rowKey}:inwardNumber`, el)}
                            value={row.inwardNumber}
                            onChange={(e) => {
                              handleRowChange(idx, 'inwardNumber', e.target.value);
                              setActiveInwardRowId(rowKey);
                              setShowInwardSuggestions(true);
                              setInwardHighlightIndex(0);
                            }}
                            onFocus={() => {
                              setActiveInwardRowId(rowKey);
                              setShowInwardSuggestions(true);
                              setInwardHighlightIndex(0);
                            }}
                            onBlur={() => {
                              setTimeout(() => setShowInwardSuggestions(false), 0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                if (!showInwardSuggestions || activeInwardMatches.length === 0) return;
                                e.preventDefault();
                                setInwardHighlightIndex((prev) => (prev + 1) % activeInwardMatches.length);
                                return;
                              }

                              if (e.key === 'ArrowUp') {
                                if (!showInwardSuggestions || activeInwardMatches.length === 0) return;
                                e.preventDefault();
                                setInwardHighlightIndex((prev) => (prev === 0 ? activeInwardMatches.length - 1 : prev - 1));
                                return;
                              }

                              if (e.key === 'Escape') {
                                setShowInwardSuggestions(false);
                                return;
                              }

                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (showInwardSuggestions && activeInwardMatches.length > 0) {
                                  const selected = activeInwardMatches[inwardHighlightIndex];
                                  if (selected) {
                                    applyInwardSelectionToRow(idx, selected);
                                    setShowInwardSuggestions(false);
                                    tryAdvanceOnEnter(idx, 'inwardNumber');
                                  }
                                  return;
                                }

                                tryAdvanceOnEnter(idx, 'inwardNumber');
                              }
                            }}
                            className="h-8 font-mono"
                          />

                          {showInwardSuggestions && activeInwardRowId === rowKey && activeInwardMatches.length > 0 && (
                            <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow">
                              {activeInwardMatches.map((item, index) => (
                                <div
                                  key={item.id}
                                  className={`cursor-pointer px-3 py-2 text-sm ${index === inwardHighlightIndex ? 'bg-muted' : ''}`}
                                  onMouseDown={() => {
                                    applyInwardSelectionToRow(idx, item);
                                    setShowInwardSuggestions(false);
                                  }}
                                  onMouseEnter={() => setInwardHighlightIndex(index)}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="font-mono text-xs">{item.inwardNumber}</div>
                                    <div className="text-xs text-muted-foreground">Exp: {toIsoDate(item.expiryDate)}</div>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">Avail: {item.quantityAvailable}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="p-1">
                        <Input value={row.expDate} readOnly className="h-8" />
                      </TableCell>

                      <TableCell className="p-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => {
                            setRows((prev) => {
                              const next = prev.filter((r) => r.id !== rowKey);
                              return next.length === 0 ? [createEmptyRow()] : next;
                            });
                          }}
                          disabled={rows.length <= 1}
                        >
                          Del
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {mode !== 'clientView' && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <Button type="button" onClick={handleSave}>
                {saveButtonLabel}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <div>Total Rows: {filledRowsCount}</div>
              <div>Grand Total Weight: {grandTotalWeight.toFixed(2)} kg</div>
            </div>
          </div>
        )}

        {mode !== 'clientView' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-8">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="md:col-span-4">
              <div className="rounded-md border p-3 text-xs">
                <div className="font-semibold">Summary</div>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  <div>Date: {voucherDate}</div>
                  <div>Entered By: {user?.name ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
