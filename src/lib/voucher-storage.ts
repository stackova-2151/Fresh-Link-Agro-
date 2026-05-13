'use client';

import type { InwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';

const INWARD_KEY = 'inwardVouchers';
const OUTWARD_KEY = 'outwardVouchers';

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadInwardVouchers(): InwardVoucher[] {
  if (typeof window === 'undefined') return [];
  const parsed = safeParseJson<InwardVoucher[]>(window.localStorage.getItem(INWARD_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function saveInwardVouchers(vouchers: InwardVoucher[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INWARD_KEY, JSON.stringify(vouchers));
}

export function loadOutwardVouchers(): OutwardVoucher[] {
  if (typeof window === 'undefined') return [];
  const parsed = safeParseJson<OutwardVoucher[]>(window.localStorage.getItem(OUTWARD_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function saveOutwardVouchers(vouchers: OutwardVoucher[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OUTWARD_KEY, JSON.stringify(vouchers));
}
