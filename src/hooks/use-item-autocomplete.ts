'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RentalItem } from '@/lib/types';

export type ItemBrandSuggestion = {
  id: string;
  displayText: string;
  itemName: string;
  brand: string;
  frequency: number;
};

export function useItemAutocomplete() {
  const [suggestions, setSuggestions] = useState<ItemBrandSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSuggestions() {
      try {
        // Load from both inward and outward vouchers
        const [inwardSnap, outwardSnap] = await Promise.all([
          getDocs(collection(db, 'inwardVouchers')),
          getDocs(collection(db, 'outwardVouchers')),
        ]);

        const itemBrandMap = new Map<string, ItemBrandSuggestion>();

        // Process inward vouchers
        inwardSnap.docs.forEach((doc) => {
          const voucher = doc.data();
          const items = voucher.items || [];
          items.forEach((item: any) => {
            if (!item.itemName || !item.brand) return;
            const key = `${item.itemName.trim().toLowerCase()}_${item.brand.trim().toLowerCase()}`;
            if (itemBrandMap.has(key)) {
              itemBrandMap.get(key)!.frequency++;
            } else {
              itemBrandMap.set(key, {
                id: key,
                displayText: `${item.itemName} - ${item.brand}`,
                itemName: item.itemName,
                brand: item.brand,
                frequency: 1,
              });
            }
          });
        });

        // Process outward vouchers
        outwardSnap.docs.forEach((doc) => {
          const voucher = doc.data();
          const items = voucher.items || [];
          items.forEach((item: any) => {
            if (!item.itemName || !item.brand) return;
            const key = `${item.itemName.trim().toLowerCase()}_${item.brand.trim().toLowerCase()}`;
            if (itemBrandMap.has(key)) {
              itemBrandMap.get(key)!.frequency++;
            } else {
              itemBrandMap.set(key, {
                id: key,
                displayText: `${item.itemName} - ${item.brand}`,
                itemName: item.itemName,
                brand: item.brand,
                frequency: 1,
              });
            }
          });
        });

        // Sort by frequency (most used first)
        const sorted = Array.from(itemBrandMap.values()).sort(
          (a, b) => b.frequency - a.frequency
        );

        setSuggestions(sorted);
      } catch (err) {
        console.error('Failed to load item suggestions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSuggestions();
  }, []);

  const filterSuggestions = useCallback(
    (searchTerm: string): ItemBrandSuggestion[] => {
      if (!searchTerm.trim()) return [];
      const lower = searchTerm.toLowerCase();
      return suggestions
        .filter((s) =>
          s.itemName.toLowerCase().includes(lower) ||
          s.brand.toLowerCase().includes(lower)
        )
        .slice(0, 10); // Limit to 10 results
    },
    [suggestions]
  );

  return { suggestions, filterSuggestions, loading };
}

/**
 * Filter item suggestions based on client's available inward stock
 * This is used for Bulk Outward Entry to show only items the selected client has in stock
 */
export function useClientStockAutocomplete(clientId: string | null, existingItems: RentalItem[]) {
  const filterSuggestionsByClientStock = useCallback(
    (searchTerm: string): ItemBrandSuggestion[] => {
      if (!searchTerm.trim() || !clientId) return [];
      
      const lower = searchTerm.toLowerCase();
      
      // Filter existingItems to get only this client's available stock
      const clientStock = existingItems.filter(
        (item) => item.clientId === clientId && item.quantityAvailable > 0
      );
      
      // Build unique item+brand combinations from client's stock
      const itemBrandMap = new Map<string, ItemBrandSuggestion>();
      
      clientStock.forEach((item) => {
        if (!item.name || !item.brand) return;
        const key = `${item.name.trim().toLowerCase()}_${item.brand.trim().toLowerCase()}`;
        if (itemBrandMap.has(key)) {
          itemBrandMap.get(key)!.frequency++;
        } else {
          itemBrandMap.set(key, {
            id: key,
            displayText: `${item.name} - ${item.brand}`,
            itemName: item.name,
            brand: item.brand,
            frequency: 1,
          });
        }
      });
      
      // Filter by search term and limit results
      const results = Array.from(itemBrandMap.values())
        .filter((s) =>
          s.itemName.toLowerCase().includes(lower) ||
          s.brand.toLowerCase().includes(lower)
        )
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10);
      
      return results;
    },
    [clientId, existingItems]
  );

  return { filterSuggestionsByClientStock };
}

/**
 * Enhanced suggestion type for Inward Stock (Outward Entry)
 * Shows Item | Brand | Inward# with full stock details
 */
export type InwardStockSuggestion = {
  id: string;
  displayText: string;
  itemName: string;
  brand: string;
  inwardNumber: string;
  batchNumber: string;
  chamberId: string;
  roomId?: string;
  blockId?: string;
  bagWeight: number;
  expiryDate: Date;
  quantityAvailable: number;
  sourceRentalItemId: string;
  subtitle?: string;
};

/**
 * Hook for Inward Stock autocomplete in Outward Entry
 * Shows Item | Brand | Inward# format with FEFO ordering
 * Each inward batch appears separately
 */
export function useInwardStockAutocomplete(
  clientId: string | null,
  existingItems: RentalItem[]
) {
  const filterByInwardStock = useCallback(
    (searchTerm: string): InwardStockSuggestion[] => {
      if (!searchTerm.trim() || !clientId) return [];

      // Filter client's available stock (FEFO applied later)
      const clientStock = existingItems.filter(
        (item) => item.clientId === clientId && item.quantityAvailable > 0
      );

      const lower = searchTerm.toLowerCase();

      // Filter by item name, brand, or inward number
      const matches = clientStock.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          item.brand.toLowerCase().includes(lower) ||
          item.inwardNumber.toLowerCase().includes(lower)
      );

      // Sort by FEFO (earliest expiry first)
      matches.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

      // Map to suggestion format (each rentalItem becomes one suggestion)
      return matches.slice(0, 10).map((item) => {
        const bagWeight = item.inwardQuantity > 0 
          ? item.inwardWeight / item.inwardQuantity 
          : 0;

        return {
          id: item.id,
          displayText: `${item.name} | ${item.brand} | ${item.inwardNumber}`,
          itemName: item.name,
          brand: item.brand,
          inwardNumber: item.inwardNumber,
          batchNumber: item.batchNumber,
          chamberId: item.chamberId ?? '',
          roomId: item.roomId,
          blockId: item.blockId,
          bagWeight: parseFloat(bagWeight.toFixed(2)),
          expiryDate: item.expiryDate,
          quantityAvailable: item.quantityAvailable,
          sourceRentalItemId: item.id,
          subtitle: `Stock: ${item.quantityAvailable} | Exp: ${
            item.expiryDate instanceof Date
              ? item.expiryDate.toLocaleDateString('en-GB')
              : new Date(item.expiryDate).toLocaleDateString('en-GB')
          }`,
        };
      });
    },
    [clientId, existingItems]
  );

  return { filterByInwardStock };
}
