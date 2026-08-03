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
