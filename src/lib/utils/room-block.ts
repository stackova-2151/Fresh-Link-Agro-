/**
 * Room and Block utility functions
 * 
 * This module provides helper functions for generating blocks and converting units.
 */

import type { Block, BlockName } from '@/lib/types/room-block';

/**
 * Generate 8 blocks (A-H) for a room.
 * Each block capacity = roomCapacityMT / 8.
 * Block IDs are deterministic based on roomId: ${roomId}_A, ${roomId}_B, etc.
 * 
 * @param roomId - The parent room ID
 * @param roomCapacityMT - Total room capacity in MT
 * @returns Array of 8 blocks with calculated capacities
 */
export function generateBlocks(roomId: string, roomCapacityMT: number): Block[] {
  const blockCapacityMT = roomCapacityMT / 8;
  const blockNames: BlockName[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  return blockNames.map((blockName) => ({
    blockId: `${roomId}_${blockName}`,
    blockName,
    capacityMT: blockCapacityMT,
  }));
}

/**
 * Convert KG to MT.
 * 
 * @param kg - Weight in kilograms
 * @returns Weight in metric tonnes
 */
export function kgToMT(kg: number): number {
  return kg / 1000;
}

/**
 * Convert MT to KG.
 * 
 * @param mt - Weight in metric tonnes
 * @returns Weight in kilograms
 */
export function mtToKG(mt: number): number {
  return mt * 1000;
}
