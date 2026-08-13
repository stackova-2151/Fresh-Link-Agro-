/**
 * Occupancy Calculation Service
 * 
 * Calculates occupancy for Chamber → Room → Block hierarchy.
 * All capacities are in MT (Metric Tonnes).
 * Stock weight is stored in KG and converted to MT for occupancy calculations.
 * 
 * Key formulas:
 * - occupiedMT = sum of RentalItem.balanceWeight / 1000 (for matching block)
 * - availableMT = max(0, capacityMT - occupiedMT)
 * - occupancyPercent = capacityMT > 0 ? (occupiedMT / capacityMT) * 100 : 0
 * 
 * Location matching:
 * A RentalItem contributes to a Block only when:
 * - rentalItem.chamberId === chamber.id
 * - rentalItem.roomId === room.roomId
 * - rentalItem.blockId === block.blockId
 * 
 * Legacy items without roomId/blockId are NOT assigned to any specific block.
 */

import type {
  Chamber,
  RentalItem,
} from '@/lib/types';
import type {
  Block,
  BlockOccupancy,
  BlockStatus,
  Room,
  RoomOccupancy,
  ChamberOccupancy,
  WarehouseOccupancy,
} from '@/lib/types/room-block';

/**
 * Occupancy Calculation Service
 */
class OccupancyService {
  /**
   * Calculate occupancy for a single block
   * 
   * @param block - Block master data
   * @param chamberId - Chamber ID for matching
   * @param roomId - Room ID for matching
   * @param rentalItems - All rental items
   * @returns Block occupancy with calculated metrics
   */
  calculateBlockOccupancy(
    block: Block,
    chamberId: string,
    roomId: string,
    rentalItems: RentalItem[]
  ): BlockOccupancy {
    // Sum balanceWeight of all items matching this block
    const occupiedKG = rentalItems
      .filter(
        (item: RentalItem) =>
          item.chamberId === chamberId &&
          item.roomId === roomId &&
          item.blockId === block.blockId
      )
      .reduce((sum: number, item: RentalItem) => {
        const weight = typeof item.balanceWeight === 'number' ? item.balanceWeight : 0;
        // Guard against negative balanceWeight
        return sum + Math.max(0, weight);
      }, 0);

    // Convert KG to MT
    const occupiedMT = occupiedKG / 1000;
    const capacityMT = block.capacityMT;
    const availableMT = Math.max(0, capacityMT - occupiedMT);
    const occupancyPercent = capacityMT > 0 ? (occupiedMT / capacityMT) * 100 : 0;

    return {
      blockId: block.blockId,
      blockName: block.blockName,
      capacityMT,
      occupiedMT,
      availableMT,
      occupancyPercent,
      status: this.getBlockStatus(occupancyPercent),
    };
  }

  /**
   * Calculate occupancy for a single room
   * 
   * @param room - Room master data
   * @param chamberId - Chamber ID for matching
   * @param rentalItems - All rental items
   * @returns Room occupancy with block breakdown
   */
  calculateRoomOccupancy(
    room: Room,
    chamberId: string,
    rentalItems: RentalItem[]
  ): RoomOccupancy {
    // Calculate occupancy for each block
    const blocksOccupancy = room.blocks.map((block: Block) =>
      this.calculateBlockOccupancy(block, chamberId, room.roomId, rentalItems)
    );

    // Aggregate room metrics
    const totalCapacityMT = room.totalCapacityMT;
    const occupiedMT = blocksOccupancy.reduce((sum: number, b: BlockOccupancy) => sum + b.occupiedMT, 0);
    const availableMT = Math.max(0, totalCapacityMT - occupiedMT);
    const occupancyPercent = totalCapacityMT > 0 ? (occupiedMT / totalCapacityMT) * 100 : 0;

    return {
      roomId: room.roomId,
      roomName: room.roomName,
      totalCapacityMT,
      occupiedMT,
      availableMT,
      occupancyPercent,
      blocks: blocksOccupancy,
    };
  }

  /**
   * Calculate occupancy for a single chamber
   * 
   * @param chamber - Chamber master data
   * @param rentalItems - All rental items
   * @returns Chamber occupancy with room breakdown
   */
  calculateChamberOccupancy(
    chamber: Chamber,
    rentalItems: RentalItem[]
  ): ChamberOccupancy {
    // Only calculate if chamber has rooms configured
    if (!chamber.rooms || chamber.rooms.length === 0) {
      return {
        chamberId: chamber.id,
        chamberName: chamber.name,
        totalCapacityMT: 0,
        occupiedMT: 0,
        availableMT: 0,
        occupancyPercent: 0,
        rooms: [],
      };
    }

    // Calculate occupancy for each room
    const roomsOccupancy = chamber.rooms.map((room) =>
      this.calculateRoomOccupancy(room, chamber.id, rentalItems)
    );

    // Aggregate chamber metrics
    const totalCapacityMT = roomsOccupancy.reduce((sum: number, r: RoomOccupancy) => sum + r.totalCapacityMT, 0);
    const occupiedMT = roomsOccupancy.reduce((sum: number, r: RoomOccupancy) => sum + r.occupiedMT, 0);
    const availableMT = Math.max(0, totalCapacityMT - occupiedMT);
    const occupancyPercent = totalCapacityMT > 0 ? (occupiedMT / totalCapacityMT) * 100 : 0;

    return {
      chamberId: chamber.id,
      chamberName: chamber.name,
      totalCapacityMT,
      occupiedMT,
      availableMT,
      occupancyPercent,
      rooms: roomsOccupancy,
    };
  }

  /**
   * Calculate occupancy for the entire warehouse
   * 
   * @param chambers - All chambers
   * @param rentalItems - All rental items
   * @returns Warehouse occupancy with chamber breakdown
   */
  calculateWarehouseOccupancy(
    chambers: Chamber[],
    rentalItems: RentalItem[]
  ): WarehouseOccupancy {
    // Calculate occupancy for each chamber
    const chambersOccupancy = chambers.map((chamber) =>
      this.calculateChamberOccupancy(chamber, rentalItems)
    );

    // Count totals
    const totalChambers = chambers.length;
    const totalRooms = chambersOccupancy.reduce((sum: number, c: ChamberOccupancy) => sum + c.rooms.length, 0);
    const totalBlocks = chambersOccupancy.reduce(
      (sum: number, c: ChamberOccupancy) => sum + c.rooms.reduce((rSum: number, r: RoomOccupancy) => rSum + r.blocks.length, 0),
      0
    );

    // Aggregate warehouse metrics
    const totalCapacityMT = chambersOccupancy.reduce((sum: number, c: ChamberOccupancy) => sum + c.totalCapacityMT, 0);
    const occupiedMT = chambersOccupancy.reduce((sum: number, c: ChamberOccupancy) => sum + c.occupiedMT, 0);
    const availableMT = Math.max(0, totalCapacityMT - occupiedMT);
    const occupancyPercent = totalCapacityMT > 0 ? (occupiedMT / totalCapacityMT) * 100 : 0;

    return {
      totalChambers,
      totalRooms,
      totalBlocks,
      totalCapacityMT,
      occupiedMT,
      availableMT,
      occupancyPercent,
      chambers: chambersOccupancy,
    };
  }

  /**
   * Determine block status based on occupancy percentage
   * 
   * Thresholds:
   * - 0% = Empty
   * - >0% and <25% = Available
   * - >=25% and <50% = Moderate
   * - >=50% and <75% = High
   * - >=75% and <95% = Near Full
   * - >=95% = Full
   * 
   * @param occupancyPercent - Occupancy percentage (0-100)
   * @returns Block status
   */
  private getBlockStatus(occupancyPercent: number): BlockStatus {
    if (occupancyPercent === 0) return 'Empty';
    if (occupancyPercent < 25) return 'Available';
    if (occupancyPercent < 50) return 'Moderate';
    if (occupancyPercent < 75) return 'High';
    if (occupancyPercent < 95) return 'Near Full';
    return 'Full';
  }

  /**
   * Get legacy items (items without roomId/blockId)
   * These items are not assigned to any specific room/block
   * 
   * @param rentalItems - All rental items
   * @returns Array of legacy rental items
   */
  getLegacyItems(rentalItems: RentalItem[]): RentalItem[] {
    return rentalItems.filter(
      (item: RentalItem) => !item.roomId || !item.blockId
    );
  }

  /**
   * Calculate total legacy occupancy (items without roomId/blockId)
   * 
   * @param rentalItems - All rental items
   * @returns Total occupied MT for legacy items
   */
  calculateLegacyOccupancyMT(rentalItems: RentalItem[]): number {
    const legacyItems = this.getLegacyItems(rentalItems);
    const occupiedKG = legacyItems.reduce((sum: number, item: RentalItem) => {
      const weight = typeof item.balanceWeight === 'number' ? item.balanceWeight : 0;
      return sum + Math.max(0, weight);
    }, 0);
    return occupiedKG / 1000;
  }
}

// Export singleton instance
export const occupancyService = new OccupancyService();
