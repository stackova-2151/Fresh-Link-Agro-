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

import type { Chamber, Client, RentalItem, User, Vendor } from '@/lib/types';

export type InwardVoucherItem = {
  id: string;
  itemName: string;
  brand: string;
  mfgDate: string;
  expDate: string;
  batch: string;
  chamberId: string;
  bags: number | '';
  unit: 'KG' | 'BAGS';
  bagWeight: number | '';
  totalWeight: number;
};

export type InwardVoucher = {
  id: string;
  inwardNo: string;
  clientId: string;
  clientName: string;
  driverName: string;
  mobile: string;
  vehicleNo: string;
  gatePassNo: string;
  date: string;
  enteredBy: string;
  notes: string;
  items: InwardVoucherItem[];
};

export type InwardConsoleMode = 'new' | 'edit' | 'clientView';

type Props = {
  clients: Client[];
  chambers: Chamber[];
  user: User | null;
  vendors: Vendor[];
  existingItems: RentalItem[];
  vouchers: InwardVoucher[];
  onUpsert: (result: { mode: InwardConsoleMode; voucher: InwardVoucher; createdItems: RentalItem[] }) => void;
  onVoucherNoChange?: (inwardNo: string) => void;
};

type RowField = keyof Omit<InwardVoucherItem, 'id' | 'totalWeight'>;

const GRID_FIELDS: RowField[] = [
  'itemName',
  'brand',
  'mfgDate',
  'expDate',
  'batch',
  'chamberId',
  'bags',
  'unit',
  'bagWeight',
];

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function createEmptyRow(): InwardVoucherItem {
  return {
    id: createId('row'),
    itemName: '',
    brand: '',
    mfgDate: '',
    expDate: '',
    batch: '',
    chamberId: '',
    bags: '',
    unit: 'KG',
    bagWeight: '',
    totalWeight: 0,
  };
}

function calcRowTotal(bags: number | '', bagWeight: number | '') {
  const b = typeof bags === 'number' ? bags : 0;
  const w = typeof bagWeight === 'number' ? bagWeight : 0;
  return b > 0 && w > 0 ? b * w : 0;
}

function isRowBlank(row: InwardVoucherItem) {
  return (
    !row.itemName &&
    !row.brand &&
    !row.mfgDate &&
    !row.expDate &&
    !row.batch &&
    !row.chamberId &&
    (row.bags === '' || row.bags === 0) &&
    (row.bagWeight === '' || row.bagWeight === 0)
  );
}

function validateRow(row: InwardVoucherItem) {
  if (!row.itemName.trim()) return 'Item Name is required';
  if (!row.chamberId) return 'Chamber is required';
  if (typeof row.bags !== 'number' || row.bags <= 0) return 'Bags must be > 0';
  if (typeof row.bagWeight !== 'number' || row.bagWeight <= 0) return 'Bag Wt must be > 0';
  return null;
}

function parseInwardSeq(inwardNo: string) {
  const match = /^INW-(\d+)$/.exec(inwardNo.trim().toUpperCase());
  if (!match) return null;
  const seq = Number(match[1]);
  return Number.isFinite(seq) ? seq : null;
}

function formatInwardNo(seq: number) {
  return `INW-${String(seq).padStart(3, '0')}`;
}

function generateNextInwardNo(vouchers: InwardVoucher[], existingItems: RentalItem[]) {
  const maxFromVouchers = vouchers
    .map((v) => parseInwardSeq(v.inwardNo))
    .filter((n): n is number => typeof n === 'number')
    .reduce((max, n) => Math.max(max, n), 0);

  const maxFromItems = existingItems
    .map((i) => parseInwardSeq(i.inwardNumber))
    .filter((n): n is number => typeof n === 'number')
    .reduce((max, n) => Math.max(max, n), 0);

  const next = Math.max(maxFromVouchers, maxFromItems) + 1;
  return formatInwardNo(next);
}

export function BulkInwardEntryForm({
  clients,
  chambers,
  user,
  vendors,
  existingItems,
  vouchers,
  onUpsert,
  onVoucherNoChange,
}: Props) {
  const { toast } = useToast();

  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [mode, setMode] = useState<InwardConsoleMode>('new');
  const [voucherDate, setVoucherDate] = useState<string>(todayIso);
  const [inwardNo, setInwardNo] = useState<string>(() => generateNextInwardNo(vouchers, existingItems));
  const [clientId, setClientId] = useState<string>('');
  const [clientInput, setClientInput] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [driverName, setDriverName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [gatePassNo, setGatePassNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [clientViewRows, setClientViewRows] = useState<Array<InwardVoucherItem & { inwardNo: string }>>([]);

  const [rows, setRows] = useState<InwardVoucherItem[]>(() =>
    [createEmptyRow()]
  );

  useEffect(() => {
    onVoucherNoChange?.(inwardNo);
  }, [inwardNo, onVoucherNoChange]);

  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setCellRef = useCallback((key: string, el: HTMLInputElement | null) => {
    cellRefs.current[key] = el;
  }, []);

  const focusCell = useCallback((rowIndex: number, field: RowField) => {
    const row = rows[rowIndex];
    if (!row) return;

    const key = `${row.id}:${field}`;
    const el = cellRefs.current[key];
    el?.focus();
    el?.select?.();
  }, [rows]);

  const grandTotalWeight = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.totalWeight || 0), 0);
  }, [rows]);

  const filledRowsCount = useMemo(() => {
    return rows.filter((r) => !isRowBlank(r)).length;
  }, [rows]);

  const addNewRow = useCallback(() => {
    if (mode === 'edit') return;
    setRows((prev) => [...prev, createEmptyRow()]);
  }, [mode]);

  const removeRow = useCallback((rowId: string) => {
    if (mode === 'edit') return;
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== rowId);
      return next.length === 0 ? [createEmptyRow()] : next;
    });
  }, [mode]);

  const handleRowChange = useCallback(
    (rowIndex: number, field: RowField, value: string) => {
      if (mode === 'edit') return; // Prevent row mutations in view mode
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[rowIndex] };

        if (field === 'bags' || field === 'bagWeight') {
          const parsed = value === '' ? '' : Number(value);
          (row as any)[field] = value === '' ? '' : Number.isFinite(parsed) ? parsed : '';
        } else if (field === 'unit') {
          row.unit = value === 'BAGS' ? 'BAGS' : 'KG';
        } else {
          (row as any)[field] = value;
        }

        row.totalWeight = calcRowTotal(row.bags, row.bagWeight);
        next[rowIndex] = row;
        return next;
      });
    },
    [mode]
  );

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

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clientId, clients]);

  const vouchersByInwardNo = useMemo(() => {
    const map = new Map<string, InwardVoucher>();
    vouchers.forEach((v) => map.set(v.inwardNo.toUpperCase(), v));
    return map;
  }, [vouchers]);

  const handleClientInputChange = useCallback(
    (value: string) => {
      setClientInput(value);
      setClientId('');

      if (!value.trim()) {
        setFilteredClients([]);
        setShowSuggestions(false);
        setHighlightIndex(0);
        return;
      }

      const results = clients.filter((c) => c.name.toLowerCase().includes(value.toLowerCase()));
      setFilteredClients(results);
      setShowSuggestions(true);
      setHighlightIndex(0);
    },
    [clients]
  );

  const handleClientSelect = useCallback((client: Client) => {
    setClientId(client.id);
    setClientInput(client.name);
    setShowSuggestions(false);
    setFilteredClients([]);
    setHighlightIndex(0);
  }, []);

  const triggerClientView = useCallback(
    (client: Client) => {
      const clientVouchers = vouchers.filter((v) => v.clientId === client.id);
      const flattened = clientVouchers.flatMap((v) => v.items.map((item) => ({ inwardNo: v.inwardNo, ...item })));
      setClientViewRows(flattened);
      setMode('clientView');
    },
    [vouchers]
  );

  const handleClientKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        if (!showSuggestions || filteredClients.length === 0) return;
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % filteredClients.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        if (!showSuggestions || filteredClients.length === 0) return;
        e.preventDefault();
        setHighlightIndex((prev) => (prev === 0 ? filteredClients.length - 1 : prev - 1));
        return;
      }

      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();

        if (showSuggestions && filteredClients.length > 0) {
          const selected = filteredClients[highlightIndex];
          if (selected) handleClientSelect(selected);
          return;
        }

        if (selectedClient) {
          triggerClientView(selectedClient);
        }
      }
    },
    [filteredClients, handleClientSelect, highlightIndex, selectedClient, showSuggestions, triggerClientView]
  );

  const loadVoucher = useCallback(
    (voucher: InwardVoucher) => {
      setMode('edit');
      setClientViewRows([]);
      setShowSuggestions(false);
      setInwardNo(voucher.inwardNo);
      setClientId(voucher.clientId);
      setClientInput(voucher.clientName);
      setFilteredClients([]);
      setHighlightIndex(0);
      setDriverName(voucher.driverName);
      setMobile(voucher.mobile);
      setVehicleNo(voucher.vehicleNo);
      setGatePassNo(voucher.gatePassNo);
      setVoucherDate(voucher.date);
      setNotes(voucher.notes);
      setRows(voucher.items.length ? voucher.items.map((i) => ({ ...i })) : [createEmptyRow()]);
      setTimeout(() => focusCell(0, 'itemName'), 0);
    },
    [focusCell]
  );

  const clearForNewEntry = useCallback(
    (nextInwardNo?: string) => {
      setMode('new');
      setVoucherDate(todayIso);
      setInwardNo(nextInwardNo ?? generateNextInwardNo(vouchers, existingItems));
      setClientId('');
      setClientInput('');
      setFilteredClients([]);
      setShowSuggestions(false);
      setHighlightIndex(0);
      setDriverName('');
      setMobile('');
      setVehicleNo('');
      setGatePassNo('');
      setNotes('');
      setRows([createEmptyRow()]);
      setClientViewRows([]);
    },
    [existingItems, todayIso, vouchers]
  );

  const handleInwardLookup = useCallback(() => {
    const key = inwardNo.trim().toUpperCase();

    setClientViewRows([]);
    setShowSuggestions(false);
    const found = vouchersByInwardNo.get(key);
    if (found) {
      loadVoucher(found);
      return;
    }

    clearForNewEntry(key);
  }, [clearForNewEntry, inwardNo, loadVoucher, vouchersByInwardNo]);

  const handleSave = useCallback(() => {
    if (mode === 'edit') return;
    const parsed = parseInwardSeq(inwardNo);
    if (!parsed) {
      toast({ variant: 'destructive', title: 'Invalid Inward No format', description: 'Use INW-001' });
      return;
    }

    if (!clientId) {
      toast({ variant: 'destructive', title: 'Client is required' });
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      toast({ variant: 'destructive', title: 'Invalid client selected' });
      return;
    }

    const enteredBy = user?.name ?? 'Unknown';

    const nonBlankRows = rows.filter((r) => !isRowBlank(r));
    if (nonBlankRows.length === 0) {
      toast({ variant: 'destructive', title: 'Add at least 1 item row before saving' });
      return;
    }

    const rowErrors: Array<{ index: number; message: string }> = [];
    nonBlankRows.forEach((r) => {
      const msg = validateRow(r);
      if (msg) rowErrors.push({ index: rows.findIndex((x) => x.id === r.id), message: msg });
    });

    if (rowErrors.length > 0) {
      const first = rowErrors[0];
      toast({
        variant: 'destructive',
        title: `Row ${first.index + 1}: ${first.message}`,
      });
      focusCell(first.index, 'itemName');
      return;
    }

    const existingVoucher = vouchersByInwardNo.get(inwardNo.trim().toUpperCase());
    const nextMode: InwardConsoleMode = existingVoucher ? 'edit' : 'new';
    const voucherId = existingVoucher?.id ?? createId('inward_voucher');

    const voucher: InwardVoucher = {
      id: voucherId,
      inwardNo,
      clientId: client.id,
      clientName: client.name,
      driverName,
      mobile,
      vehicleNo,
      gatePassNo,
      date: voucherDate,
      enteredBy,
      notes,
      items: nonBlankRows,
    };

    const vendorId = vendors[0]?.id ?? 'vendor_01';

    const createdItems: RentalItem[] = nonBlankRows.map((r) => {
      const qty = typeof r.bags === 'number' ? r.bags : 0;
      const wt = r.totalWeight;
      const exp = r.expDate ? new Date(r.expDate) : new Date(voucherDate);
      const storage = new Date(voucherDate);

      return {
        id: createId('rental_item'),
        inwardNumber: inwardNo,
        name: r.itemName.trim(),
        brand: r.brand.trim(),
        batchNumber: r.batch.trim(),
        category: 'General',
        description: '',
        rentalRate: 0,
        rentalCycles: ['daily'],
        inwardQuantity: qty,
        outwardQuantity: 0,
        quantityAvailable: qty,
        unit: 'kg',
        inwardWeight: wt,
        outwardWeight: 0,
        balanceWeight: wt,
        expiryDate: exp,
        storageDate: storage,
        temperatureRange: '',
        vendorId,
        clientId: client.id,
        chamberId: r.chamberId,
        block: '',
        zone: '',
        driverName,
        vehicleNumber: vehicleNo,
        images: [],
        condition: 'Good',
      };
    });

    onUpsert({ mode: nextMode, voucher, createdItems });

    toast({
      title: nextMode === 'edit' ? 'Inward voucher updated' : 'Inward voucher saved',
      description: `${voucher.inwardNo} • ${client.name} • ${nonBlankRows.length} rows • ${grandTotalWeight.toFixed(2)} kg`,
    });

    if (nextMode === 'new') {
      const nextInwardNo = generateNextInwardNo([...vouchers, voucher], [...existingItems, ...createdItems]);
      clearForNewEntry(nextInwardNo);
      return;
    }

    setMode('edit');
  }, [
    clearForNewEntry,
    clientId,
    clients,
    driverName,
    existingItems,
    focusCell,
    gatePassNo,
    grandTotalWeight,
    inwardNo,
    mobile,
    notes,
    onUpsert,
    rows,
    toast,
    user?.name,
    vehicleNo,
    vouchers,
    vendors,
    voucherDate,
    vouchersByInwardNo,
  ]);

  const isEditMode = mode === 'edit';

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Inward Entry</div>
            {isEditMode && <div className="text-xs text-muted-foreground">Viewing: {inwardNo}</div>}
            {mode === 'clientView' && (
              <div className="text-xs text-muted-foreground">
                Showing results for: {selectedClient?.name ?? 'Client'}
              </div>
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
            <Label>Inward No</Label>
            <Input
              value={inwardNo}
              onChange={(e) => {
                setInwardNo(e.target.value.toUpperCase());
                setMode(vouchersByInwardNo.has(e.target.value.trim().toUpperCase()) ? 'edit' : 'new');
                setClientViewRows([]);
                setShowSuggestions(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleInwardLookup();
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
                  if (filteredClients.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 0);
                }}
              />

              {showSuggestions && filteredClients.length > 0 && (
                <div className="absolute z-[100] mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-lg">
                  {filteredClients.map((client, index) => (
                    <div
                      key={client.id}
                      className={`cursor-pointer px-3 py-2 text-sm ${index === highlightIndex ? 'bg-muted' : ''}`}
                      onMouseDown={() => handleClientSelect(client)}
                      onMouseEnter={() => setHighlightIndex(index)}
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
            <Input
              type="date"
              value={voucherDate}
              onChange={(e) => { if (mode !== 'edit') setVoucherDate(e.target.value); }}
              readOnly={isEditMode}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Gate Pass No</Label>
            <Input value={gatePassNo} onChange={(e) => { if (mode !== 'edit') setGatePassNo(e.target.value); }} readOnly={isEditMode} />
          </div>

          <div className="md:col-span-2">
            <Label>Vehicle No</Label>
            <Input value={vehicleNo} onChange={(e) => { if (mode !== 'edit') setVehicleNo(e.target.value); }} readOnly={isEditMode} />
          </div>

          <div className="md:col-span-2">
            <Label>Driver Name</Label>
            <Input value={driverName} onChange={(e) => { if (mode !== 'edit') setDriverName(e.target.value); }} readOnly={isEditMode} />
          </div>

          <div className="md:col-span-2">
            <Label>Mobile No</Label>
            <Input value={mobile} onChange={(e) => { if (mode !== 'edit') setMobile(e.target.value); }} readOnly={isEditMode} />
          </div>
        </div>

        {mode === 'clientView' ? (
          <div className="overflow-x-auto rounded-md border">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[90px]">Inward No</TableHead>
                  <TableHead className="w-[220px]">Item Name</TableHead>
                  <TableHead className="w-[160px]">Brand</TableHead>
                  <TableHead className="w-[140px]">Mfg Date</TableHead>
                  <TableHead className="w-[140px]">Exp Date</TableHead>
                  <TableHead className="w-[140px]">Batch</TableHead>
                  <TableHead className="w-[200px]">Chamber</TableHead>
                  <TableHead className="w-[90px] text-right">Bags</TableHead>
                  <TableHead className="w-[120px]">Unit</TableHead>
                  <TableHead className="w-[110px] text-right">Bag Wt</TableHead>
                  <TableHead className="w-[120px] text-right">Tot Wt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientViewRows.map((row) => (
                  <TableRow key={`${row.inwardNo}:${row.id}`} className="hover:bg-transparent">
                    <TableCell className="font-mono text-xs">{row.inwardNo}</TableCell>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell>{row.brand}</TableCell>
                    <TableCell>{row.mfgDate}</TableCell>
                    <TableCell>{row.expDate}</TableCell>
                    <TableCell>{row.batch}</TableCell>
                    <TableCell>{chambers.find((c) => c.id === row.chamberId)?.name ?? ''}</TableCell>
                    <TableCell className="text-right">{row.bags}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell className="text-right">{row.bagWeight}</TableCell>
                    <TableCell className="text-right">{row.totalWeight ? row.totalWeight.toFixed(2) : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible rounded-md border">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[220px]">Item Name</TableHead>
                  <TableHead className="w-[160px]">Brand</TableHead>
                  <TableHead className="w-[140px]">Mfg Date</TableHead>
                  <TableHead className="w-[140px]">Exp Date</TableHead>
                  <TableHead className="w-[140px]">Batch</TableHead>
                  <TableHead className="w-[200px]">Chamber</TableHead>
                  <TableHead className="w-[90px] text-right">Bags</TableHead>
                  <TableHead className="w-[120px]">Unit</TableHead>
                  <TableHead className="w-[110px] text-right">Bag Wt</TableHead>
                  <TableHead className="w-[120px] text-right">Tot Wt</TableHead>
                  {mode !== 'edit' && <TableHead className="w-[70px] text-right">Del</TableHead>}
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
                          readOnly={isEditMode}
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
                          readOnly={isEditMode}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          ref={(el) => setCellRef(`${rowKey}:mfgDate`, el)}
                          type="date"
                          value={row.mfgDate}
                          onChange={(e) => handleRowChange(idx, 'mfgDate', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tryAdvanceOnEnter(idx, 'mfgDate');
                            }
                          }}
                          readOnly={isEditMode}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          ref={(el) => setCellRef(`${rowKey}:expDate`, el)}
                          type="date"
                          value={row.expDate}
                          onChange={(e) => handleRowChange(idx, 'expDate', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tryAdvanceOnEnter(idx, 'expDate');
                            }
                          }}
                          readOnly={isEditMode}
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
                          readOnly={isEditMode}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Select
                          value={row.chamberId}
                          onValueChange={(val) => handleRowChange(idx, 'chamberId', val)}
                        >
                          <SelectTrigger className={`h-8${isEditMode ? ' pointer-events-none' : ''}`}>
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
                          readOnly={isEditMode}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Select value={row.unit} onValueChange={(val) => handleRowChange(idx, 'unit', val)}>
                          <SelectTrigger className={`h-8${isEditMode ? ' pointer-events-none' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KG">KG</SelectItem>
                            <SelectItem value="BAGS">BAGS</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          ref={(el) => setCellRef(`${rowKey}:bagWeight`, el)}
                          inputMode="decimal"
                          value={row.bagWeight}
                          onChange={(e) => handleRowChange(idx, 'bagWeight', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tryAdvanceOnEnter(idx, 'bagWeight');
                            }
                          }}
                          readOnly={isEditMode}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input value={row.totalWeight ? row.totalWeight.toFixed(2) : ''} readOnly className="h-8 text-right" />
                      </TableCell>
                      {mode !== 'edit' && (
                        <TableCell className="p-1 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length <= 1}
                          >
                            Del
                          </Button>
                        </TableCell>
                      )}
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
              {mode !== 'edit' && (
                <Button type="button" onClick={handleSave}>
                  Save Entry
                </Button>
              )}
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
              <Textarea value={notes} onChange={(e) => { if (mode !== 'edit') setNotes(e.target.value); }} readOnly={isEditMode} />
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
