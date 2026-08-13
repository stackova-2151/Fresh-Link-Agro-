/**
 * Room and Block types for Chamber Management
 * 
 * This module defines the data model for the hierarchical Chamber → Room → Block structure.
 * All capacities are in MT (Metric Tonnes).
 * Occupancy is calculated dynamically from stock (stored in KG).
 */

// Block names are fixed: A, B, C, D, E, F, G, H
export type BlockName = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

// Block master data (stored in Chamber document)
export type Block = {
  blockId: string;              // Unique block ID (deterministic: ${roomId}_A, ${roomId}_B, etc.)
  blockName: BlockName;         // A, B, C, D, E, F, G, H
  capacityMT: number;           // Capacity in MT (Room Capacity / 8)
  // NOTE: occupiedMT, availableMT, occupancyPercent are NOT stored
  // These are calculated dynamically from stock
};

// Room master data (stored in Chamber document)
export type Room = {
  roomId: string;               // Unique room ID
  roomName: string;             // e.g., "1-G", "1A", "1B", "1C", "1D"
  totalCapacityMT: number;      // Total capacity in MT
  blocks: Block[];              // 8 blocks (A-H)
};

// Block occupancy (calculated dynamically, NOT stored)
export type BlockOccupancy = {
  blockId: string;
  blockName: BlockName;
  capacityMT: number;
  occupiedMT: number;          // Calculated from stock balanceWeight / 1000
  availableMT: number;         // capacityMT - occupiedMT
  occupancyPercent: number;     // (occupiedMT / capacityMT) * 100
  status: BlockStatus;
};

export type BlockStatus = 'Empty' | 'Available' | 'Moderate' | 'High' | 'Near Full' | 'Full';

// Room occupancy (calculated dynamically, NOT stored)
export type RoomOccupancy = {
  roomId: string;
  roomName: string;
  totalCapacityMT: number;
  occupiedMT: number;          // Sum of all blocks' occupiedMT
  availableMT: number;         // totalCapacityMT - occupiedMT
  occupancyPercent: number;     // (occupiedMT / totalCapacityMT) * 100
  blocks: BlockOccupancy[];    // All 8 blocks with their occupancy
};

// Chamber occupancy (calculated dynamically, NOT stored)
export type ChamberOccupancy = {
  chamberId: string;
  chamberName: string;
  totalCapacityMT: number;      // Sum of all rooms' totalCapacityMT
  occupiedMT: number;          // Sum of all rooms' occupiedMT
  availableMT: number;         // totalCapacityMT - occupiedMT
  occupancyPercent: number;     // (occupiedMT / totalCapacityMT) * 100
  rooms: RoomOccupancy[];      // All rooms with their occupancy
};

// Warehouse occupancy (calculated dynamically, NOT stored)
export type WarehouseOccupancy = {
  totalChambers: number;
  totalRooms: number;
  totalBlocks: number;
  totalCapacityMT: number;
  occupiedMT: number;
  availableMT: number;
  occupancyPercent: number;
  chambers: ChamberOccupancy[];
};
