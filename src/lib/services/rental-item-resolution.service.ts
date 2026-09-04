/**
 * Rental Item Resolution Service
 * 
 * Provides safe resolution of rental items using exact identity with ambiguity-safe legacy fallback.
 * This ensures stock identity is always determined by exact RentalItem.id, never by business fields alone.
 */

import type { RentalItem } from '@/lib/types';

export type ResolutionStatus = 'exact' | 'legacy-resolved' | 'unresolved' | 'ambiguous';

export interface ResolutionResult {
  status: ResolutionStatus;
  rentalItemId?: string;
  candidates?: RentalItem[];
  message?: string;
}

/**
 * Resolve a rental item by exact ID with ambiguity-safe legacy fallback.
 * 
 * @param rentalItemId - The exact rental item ID (if available)
 * @param rentalItems - All rental items to search for legacy resolution
 * @param legacyMatchCriteria - Optional business field criteria for legacy matching
 * @returns Resolution result with status and rental item ID if resolved
 */
export function resolveRentalItem(
  rentalItemId: string | undefined,
  rentalItems: RentalItem[],
  legacyMatchCriteria?: {
    inwardNumber?: string;
    itemName?: string;
    brand?: string;
    batch?: string;
    chamberId?: string;
  }
): ResolutionResult {
  // Priority 1: Exact ID resolution
  if (rentalItemId) {
    const exactMatch = rentalItems.find(item => item.id === rentalItemId);
    if (exactMatch) {
      return {
        status: 'exact',
        rentalItemId: exactMatch.id,
      };
    }
    
    // ID exists but rental item not found - broken reference
    return {
      status: 'unresolved',
      message: `Rental item with ID "${rentalItemId}" not found in available rental items`,
    };
  }
  
  // Priority 2: Legacy resolution using business fields
  if (!legacyMatchCriteria) {
    return {
      status: 'unresolved',
      message: 'No rentalItemId provided and no legacy match criteria available',
    };
  }
  
  const { inwardNumber, itemName, brand, batch, chamberId } = legacyMatchCriteria;
  
  // Find all matching rental items using business fields
  const matches = rentalItems.filter(item => {
    if (inwardNumber && item.inwardNumber !== inwardNumber) return false;
    if (itemName && item.name.trim().toLowerCase() !== itemName.trim().toLowerCase()) return false;
    if (brand && item.brand.trim().toLowerCase() !== brand.trim().toLowerCase()) return false;
    if (batch && item.batchNumber.trim() !== batch.trim()) return false;
    if (chamberId && item.chamberId !== chamberId) return false;
    return true;
  });
  
  // Check for ambiguity
  if (matches.length === 0) {
    return {
      status: 'unresolved',
      message: 'No rental item found matching business fields',
    };
  }
  
  if (matches.length === 1) {
    return {
      status: 'legacy-resolved',
      rentalItemId: matches[0].id,
      message: 'Legacy resolution: exactly one match found',
    };
  }
  
  // Multiple matches - ambiguous
  return {
    status: 'ambiguous',
    candidates: matches,
    message: `Ambiguous match: ${matches.length} rental items match business fields. Cannot safely resolve.`,
  };
}

/**
 * Resolve multiple rental items in batch with status tracking.
 * 
 * @param resolutions - Array of resolution results
 * @returns Summary of resolution statistics
 */
export function summarizeResolutions(resolutions: ResolutionResult[]): {
  total: number;
  exact: number;
  legacyResolved: number;
  unresolved: number;
  ambiguous: number;
  warnings: string[];
} {
  const summary = {
    total: resolutions.length,
    exact: 0,
    legacyResolved: 0,
    unresolved: 0,
    ambiguous: 0,
    warnings: [] as string[],
  };
  
  for (const resolution of resolutions) {
    if (resolution.status === 'exact') summary.exact++;
    else if (resolution.status === 'legacy-resolved') summary.legacyResolved++;
    else if (resolution.status === 'unresolved') summary.unresolved++;
    else if (resolution.status === 'ambiguous') summary.ambiguous++;
    
    if (resolution.status === 'legacy-resolved') {
      summary.warnings.push(`Legacy resolved: ${resolution.message}`);
    }
    
    if (resolution.status === 'unresolved') {
      summary.warnings.push(`Unresolved: ${resolution.message}`);
    }
    
    if (resolution.status === 'ambiguous') {
      summary.warnings.push(`Ambiguous: ${resolution.message}`);
    }
  }
  
  return summary;
}
