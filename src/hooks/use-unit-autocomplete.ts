'use client';

import { useCallback, useMemo } from 'react';
import type { RentalItem } from '@/lib/types';
import type { AutocompleteSuggestion } from '@/components/shared/portal-autocomplete';

export interface UnitSuggestion extends AutocompleteSuggestion {
  unit: string;
}

/**
 * Hook for Unit autocomplete in Inward Entry
 * Extracts unique units from existing RentalItems
 * Sorts by frequency (most used first)
 */
export function useUnitAutocomplete(rentalItems: RentalItem[]) {
  // Extract and count unique units
  const suggestions = useMemo(() => {
    const unitMap = new Map<string, number>();

    rentalItems.forEach((item) => {
      const unit = item.unit.trim().toUpperCase();
      if (unit.length > 0) {
        unitMap.set(unit, (unitMap.get(unit) || 0) + 1);
      }
    });

    return Array.from(unitMap.entries())
      .map(([unit, frequency]) => ({
        id: unit.toLowerCase(),
        displayText: unit,
        unit,
        frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }, [rentalItems]);

  // Filter suggestions by search term
  const filterUnits = useCallback(
    (searchTerm: string): UnitSuggestion[] => {
      if (!searchTerm.trim()) return [];

      const lower = searchTerm.toLowerCase();
      return suggestions
        .filter((s) => s.unit.toLowerCase().includes(lower))
        .slice(0, 10);
    },
    [suggestions]
  );

  return { suggestions, filterUnits };
}
