'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Search, Trash2, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { clientsService } from '@/lib/firestore';
import { customerRatesService } from '@/lib/firestore';
import type { Client, CustomerRate } from '@/lib/types';
import type { InwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClientAutocomplete } from '@/hooks/use-client-autocomplete';

type RateRow = {
  id: string;
  itemDescription: string;
  rentPer: string;
  ratePer: string;
  rate: number | '';
  loadingPer: string;
  loading: number | '';
  loadingRatePer: string;
  hsnCode: string;
  gstRate: number | '';
};

export default function CustomerRateMasterPage() {
  const [clients, setClients] = useState<Client[]>([]);

  const clientAC = useClientAutocomplete({ clients });
  // Alias for readability in handlers below
  const selectedClient = clientAC.selectedClient;
  
  const [rateRows, setRateRows] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { toast } = useToast();

  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await clientsService.getAll();
        setClients(data);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
      }
    };
    loadClients();
  }, [toast]);



  // Process button - fetch distinct inward items and merge with existing rates
  const handleProcess = useCallback(async () => {
    if (!selectedClient) return;

    setProcessing(true);
    try {
      // Fetch distinct item descriptions from customer's inward entries
      const inwardVouchersQuery = query(
        collection(db, 'inwardVouchers'),
        where('clientId', '==', selectedClient.id),
        orderBy('date', 'desc')
      );
      const inwardSnap = await getDocs(inwardVouchersQuery);
      const inwardVouchers = inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));

      // Get distinct item descriptions
      const distinctItems = new Map<string, string>();
      inwardVouchers.forEach((voucher) => {
        voucher.items.forEach((item) => {
          if (item.itemName && !distinctItems.has(item.itemName)) {
            distinctItems.set(item.itemName, item.itemName);
          }
        });
      });

      if (distinctItems.size === 0) {
        toast({ title: 'No items found', description: 'This customer has no inward entries.' });
        setProcessing(false);
        return;
      }

      // Fetch existing customer rates
      const existingRates = await customerRatesService.getByClient(selectedClient.id);
      const existingRatesMap = new Map(existingRates.map((r) => [r.itemDescription, r]));

      // Merge: keep existing rates, add new items as blank rows
      const mergedRows: RateRow[] = [];
      distinctItems.forEach((itemDescription) => {
        const existing = existingRatesMap.get(itemDescription);
        if (existing) {
          mergedRows.push({
            id: existing.id,
            itemDescription,
            rentPer: existing.rentPer || '',
            ratePer: existing.ratePer || '',
            rate: existing.rate || '',
            loadingPer: existing.loadingPer || '',
            loading: existing.loading || '',
            loadingRatePer: existing.loadingRatePer || '',
            hsnCode: existing.hsnCode || '',
            gstRate: existing.gstRate || '',
          });
        } else {
          mergedRows.push({
            id: '',
            itemDescription,
            rentPer: '',
            ratePer: '',
            rate: '',
            loadingPer: '',
            loading: '',
            loadingRatePer: '',
            hsnCode: '',
            gstRate: '',
          });
        }
      });

      setRateRows(mergedRows);
      toast({ title: 'Success', description: `Loaded ${mergedRows.length} items for ${selectedClient.name}` });
    } catch (error) {
      // Detect Firebase index error
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'failed-precondition' && firebaseError.message?.includes('index')) {
        toast({
          title: 'Firestore Index Required',
          description: 'This query requires a Composite Index. Please deploy firestore.indexes.json to Firebase.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Error', description: 'Failed to process customer rates.', variant: 'destructive' });
      }
    } finally {
      setProcessing(false);
    }
  }, [selectedClient, toast]);

  // Update rate row field
  const handleRowChange = useCallback((index: number, field: keyof RateRow, value: string | number) => {
    setRateRows((prev) => {
      const updated = [...prev];
      // Numeric fields: rate, loading, gstRate
      if (field === 'rate' || field === 'loading' || field === 'gstRate') {
        updated[index][field] = value === '' ? '' : Number(value);
      } else {
        // Text fields: rentPer, ratePer, loadingPer, loadingRatePer, hsnCode
        updated[index][field] = value as string;
      }
      return updated;
    });
  }, []);

  // Validate rows
  const validateRows = useCallback((): boolean => {
    for (let i = 0; i < rateRows.length; i++) {
      const row = rateRows[i];
      
      // Validate GST Rate (if provided)
      if (typeof row.gstRate === 'number' && (row.gstRate < 0 || row.gstRate > 100)) {
        toast({ title: 'Validation Error', description: `Row ${i + 1}: GST Rate must be between 0 and 100.`, variant: 'destructive' });
        return false;
      }
      
      // Validate Rate (if provided)
      if (typeof row.rate === 'number' && row.rate < 0) {
        toast({ title: 'Validation Error', description: `Row ${i + 1}: Rate cannot be negative.`, variant: 'destructive' });
        return false;
      }
      
      // Validate Loading (if provided)
      if (typeof row.loading === 'number' && row.loading < 0) {
        toast({ title: 'Validation Error', description: `Row ${i + 1}: Loading cannot be negative.`, variant: 'destructive' });
        return false;
      }
    }
    return true;
  }, [rateRows, toast]);

  // Save rates
  const handleSave = useCallback(async () => {
    if (!selectedClient) return;

    if (!validateRows()) return;

    setSaving(true);
    try {
      // Delete all existing rates for this client
      await customerRatesService.deleteByClient(selectedClient.id);

      // Create new rates
      const savePromises = rateRows.map((row) => {
        const rateData: Omit<CustomerRate, 'id'> = {
          clientId: selectedClient.id,
          itemDescription: row.itemDescription,
          rentPer: row.rentPer || '',
          ratePer: row.ratePer || '',
          rate: typeof row.rate === 'number' ? row.rate : 0,
          loadingPer: row.loadingPer || '',
          loading: typeof row.loading === 'number' ? row.loading : 0,
          loadingRatePer: row.loadingRatePer || '',
          hsnCode: row.hsnCode || '',
          gstRate: typeof row.gstRate === 'number' ? row.gstRate : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return customerRatesService.create(rateData);
      });

      await Promise.all(savePromises);
      toast({ title: 'Success', description: `Saved ${rateRows.length} rate records for ${selectedClient.name}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save customer rates.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [selectedClient, rateRows, validateRows, toast]);

  // Delete rates
  const handleDelete = useCallback(async () => {
    if (!selectedClient) return;

    try {
      await customerRatesService.deleteByClient(selectedClient.id);
      setRateRows([]);
      setShowDeleteDialog(false);
      toast({ title: 'Success', description: `Deleted all rates for ${selectedClient.name}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete customer rates.', variant: 'destructive' });
    }
  }, [selectedClient, toast]);

  const processDisabled = !selectedClient || processing;
  const saveDisabled = rateRows.length === 0 || saving;
  const deleteDisabled = !selectedClient || rateRows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Rate Master" description="Manage rental rates for customer items.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => clientAC.clearSelection()} disabled={!selectedClient}>
            Clear
          </Button>
        </div>
      </PageHeader>

      <Card className="max-w-7xl mx-auto">
        <CardHeader>
          <CardTitle>Customer Rate Master</CardTitle>
          <CardDescription>Search customer and process their inward items to manage rates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Search */}
          <div className="space-y-2">
            <Label htmlFor="customer-search">Customer Name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer-search"
                placeholder="Search customer..."
                value={clientAC.inputValue}
                onChange={clientAC.handleInputChange}
                onKeyDown={clientAC.handleKeyDown}
                onBlur={clientAC.handleBlur}
                onFocus={clientAC.handleFocus}
                className="pl-10"
              />
              {clientAC.isOpen && clientAC.suggestions.length > 0 && (
                <div ref={clientAC.listRef} className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {clientAC.suggestions.map((client, index) => (
                    <div key={client.id} {...clientAC.getSuggestionProps(client, index)}>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-muted-foreground">{client.phone || client.optionalPhone || 'No phone'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleProcess} disabled={processDisabled}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Process
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={deleteDisabled}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>

          {/* Rate Table */}
          {rateRows.length > 0 && (
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Item Description</TableHead>
                      <TableHead className="w-[140px]">Rent Per</TableHead>
                      <TableHead className="w-[140px]">Rate Per</TableHead>
                      <TableHead className="w-[140px]">Rate</TableHead>
                      <TableHead className="w-[140px]">Loading Per</TableHead>
                      <TableHead className="w-[140px]">Loading</TableHead>
                      <TableHead className="w-[140px]">Rate Per</TableHead>
                      <TableHead className="w-[130px]">HSN Code</TableHead>
                      <TableHead className="w-[110px]">GST Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateRows.map((row, index) => (
                      <TableRow key={`${row.itemDescription}-${index}`} className="table-row-hover">
                        <TableCell className="font-medium uppercase">{row.itemDescription}</TableCell>
                        <TableCell className="cell-editable">
                          <Input
                            type="text"
                            value={row.rentPer}
                            onChange={(e) => handleRowChange(index, 'rentPer', e.target.value)}
                            className="w-full"
                            placeholder=""
                          />
                        </TableCell>
                        <TableCell className="cell-editable">
                          <Input
                            type="text"
                            value={row.ratePer}
                            onChange={(e) => handleRowChange(index, 'ratePer', e.target.value)}
                            className="w-full"
                            placeholder=""
                          />
                        </TableCell>
                        <TableCell className="cell-editable">
                          <Input
                            type="number"
                            value={row.rate === '' ? '' : row.rate}
                            onChange={(e) => handleRowChange(index, 'rate', e.target.value)}
                            className="w-full"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell className="cell-editable">
                          <Input
                            type="text"
                            value={row.loadingPer}
                            onChange={(e) => handleRowChange(index, 'loadingPer', e.target.value)}
                            className="w-full"
                            placeholder=""
                          />
                        </TableCell>
                        <TableCell className="cell-editable">
                          <Input
                            type="number"
                            value={row.loading === '' ? '' : row.loading}
                            onChange={(e) => handleRowChange(index, 'loading', e.target.value)}
                            className="w-full"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell className="cell-editable">
                          <Input
                            type="text"
                            value={row.loadingRatePer}
                            onChange={(e) => handleRowChange(index, 'loadingRatePer', e.target.value)}
                            className="w-full"
                            placeholder=""
                          />
                        </TableCell>
                        <TableCell className="cell-editable">
                          <Input
                            type="text"
                            value={row.hsnCode}
                            onChange={(e) => handleRowChange(index, 'hsnCode', e.target.value)}
                            className="w-full"
                            placeholder="HSN"
                          />
                        </TableCell>
                        <TableCell className="cell-editable">
                          <Input
                            type="number"
                            value={row.gstRate === '' ? '' : row.gstRate}
                            onChange={(e) => handleRowChange(index, 'gstRate', e.target.value)}
                            className="w-full"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saveDisabled} size="lg">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Customer Rates
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {selectedClient && rateRows.length === 0 && !processing && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Click "Process" to load customer items and rates.</p>
            </div>
          )}

          {/* Loading Skeleton */}
          {processing && (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer Rates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all rate records for {selectedClient?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
