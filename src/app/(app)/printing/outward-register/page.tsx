'use client';

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { clients } from '@/lib/data';
import type { Client } from '@/lib/types';

function buildPrintUrl(params: { customerId?: string; from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params.customerId) search.set('customerId', params.customerId);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const qs = search.toString();
  return `/printing/outward-register/print${qs ? `?${qs}` : ''}`;
}

export default function OutwardRegisterFilterPage() {
  const router = useRouter();

  const [customerId, setCustomerId] = useState<string>('');
  const [customerInput, setCustomerInput] = useState<string>('');

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [filteredCustomers, setFilteredCustomers] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selectedCustomer = useMemo(() => clients.find((c) => c.id === customerId) ?? null, [customerId]);

  const handleCustomerInputChange = useCallback((value: string) => {
    setCustomerInput(value);
    setCustomerId('');

    if (!value.trim()) {
      setFilteredCustomers([]);
      setShowSuggestions(false);
      setHighlightIndex(0);
      return;
    }

    const results = clients.filter((c) => c.name.toLowerCase().includes(value.toLowerCase()));
    setFilteredCustomers(results);
    setShowSuggestions(true);
    setHighlightIndex(0);
  }, []);

  const handleCustomerSelect = useCallback((client: Client) => {
    setCustomerId(client.id);
    setCustomerInput(client.name);
    setShowSuggestions(false);
    setFilteredCustomers([]);
    setHighlightIndex(0);
  }, []);

  const handleCustomerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        if (!showSuggestions || filteredCustomers.length === 0) return;
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % filteredCustomers.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        if (!showSuggestions || filteredCustomers.length === 0) return;
        e.preventDefault();
        setHighlightIndex((prev) => (prev === 0 ? filteredCustomers.length - 1 : prev - 1));
        return;
      }

      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }

      if (e.key === 'Enter') {
        if (showSuggestions && filteredCustomers.length > 0) {
          e.preventDefault();
          const selected = filteredCustomers[highlightIndex];
          if (selected) handleCustomerSelect(selected);
        }
      }
    },
    [filteredCustomers, handleCustomerSelect, highlightIndex, showSuggestions]
  );

  const handlePrint = useCallback(() => {
    router.push(
      buildPrintUrl({
        customerId: customerId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
    );
  }, [customerId, fromDate, router, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader title="Outward Register" description="Filter and print outward register from saved outward vouchers." />

      <Card className="max-w-4xl mx-auto border shadow-sm">
        <CardHeader className="py-4">
          <div className="text-sm font-semibold">Filters</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <Label>Customer Name</Label>
              <div className="relative">
                <Input
                  placeholder="Type customer name..."
                  value={customerInput}
                  onChange={(e) => handleCustomerInputChange(e.target.value)}
                  onKeyDown={handleCustomerKeyDown}
                  onFocus={() => {
                    if (filteredCustomers.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 0);
                  }}
                />

                {showSuggestions && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow">
                    {filteredCustomers.map((c, index) => (
                      <div
                        key={c.id}
                        className={`cursor-pointer px-3 py-2 text-sm ${index === highlightIndex ? 'bg-muted' : ''}`}
                        onMouseDown={() => handleCustomerSelect(c)}
                        onMouseEnter={() => setHighlightIndex(index)}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer ? (
                <div className="mt-1 text-xs text-muted-foreground">Selected: {selectedCustomer.name}</div>
              ) : null}
            </div>

            <div className="md:col-span-3">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="md:col-span-3">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handlePrint}>Print</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
