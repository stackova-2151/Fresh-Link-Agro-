'use client';

import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-context';
import {
  getTodayCounts,
  getTotalStock,
  getUserCounts,
  getWarehouseMetrics,
  type TodayCounts,
  type TotalStock,
  type UserCounts,
  type WarehouseMetrics,
} from '@/lib/dashboard-metrics';
import { clientsService, rentalItemsService } from '@/lib/firestore';
import { occupancyService, type BlockStockDetails } from '@/lib/services/occupancy.service';
import type { Client, RentalItem } from '@/lib/types';

import { Archive, ArrowDownRight, ArrowUpRight, Users, Warehouse, Loader2 } from 'lucide-react';
import { WarehouseSummary } from '@/components/dashboard/warehouse-summary';
import { ChamberOccupancyCard } from '@/components/dashboard/chamber-occupancy-card';
import { BlockStockDetailsModal } from '@/components/dashboard/block-stock-details-modal';
import type { BlockOccupancy } from '@/lib/types/room-block';

export default function DashboardPage() {
  const { user } = useUser();

  const [todayCounts, setTodayCounts] = useState<TodayCounts>({ todayInwardCount: 0, todayOutwardCount: 0 });
  const [stock, setStock] = useState<TotalStock>({ totalQuantity: 0, totalWeight: 0 });
  const [userCounts, setUserCounts] = useState<UserCounts>({ totalAdmins: 0, activeAdmins: 0, inactiveAdmins: 0, totalSubAdmins: 0, activeSubAdmins: 0, inactiveSubAdmins: 0 });
  const [warehouseMetrics, setWarehouseMetrics] = useState<WarehouseMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChambers, setExpandedChambers] = useState<Set<string>>(new Set());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<{ block: BlockOccupancy; roomName: string; chamberId: string; chamberName: string } | null>(null);
  const [stockDetails, setStockDetails] = useState<BlockStockDetails | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);

  const toggleChamber = (chamberId: string) => {
    setExpandedChambers((prev) => {
      const next = new Set(prev);
      if (next.has(chamberId)) {
        next.delete(chamberId);
        // Also reset room selection when collapsing chamber
        setSelectedRoomId(null);
      } else {
        next.add(chamberId);
      }
      return next;
    });
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const handleBackToRooms = () => {
    setSelectedRoomId(null);
  };

  const handleBlockClick = (block: BlockOccupancy, roomName: string, chamberId: string, chamberName: string) => {
    setSelectedBlock({ block, roomName, chamberId, chamberName });
    
    // Calculate stock details for the selected block
    // Use selectedRoomId from state for accurate room filtering
    if (selectedRoomId) {
      const details = occupancyService.getBlockStockDetails(
        chamberId,
        chamberName,
        selectedRoomId,
        roomName,
        block.blockId,
        block.blockName,
        rentalItems,
        clients
      );
      setStockDetails(details);
    }
  };

  const handleCloseBlockDetail = () => {
    setSelectedBlock(null);
    setStockDetails(null);
  };

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [tc, st, uc, wm, cl, ri] = await Promise.all([
          getTodayCounts(),
          getTotalStock(),
          getUserCounts(),
          getWarehouseMetrics(),
          clientsService.getAll(),
          rentalItemsService.getAll(),
        ]);
        setTodayCounts(tc);
        setStock(st);
        setUserCounts(uc);
        setWarehouseMetrics(wm);
        setClients(cl);
        setRentalItems(ri);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  const role = user?.role;
  const isMaster = role === 'MASTER_ADMIN';
  const isAdmin = role === 'ADMIN';
  const isSubAdmin = role === 'SUB_ADMIN';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Welcome back! Here's what's happening today." />

      {/* Warehouse Summary */}
      {warehouseMetrics && (
        <WarehouseSummary metrics={warehouseMetrics} />
      )}

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isMaster && (
          <StatCard
            title="Total Admins"
            value={userCounts.totalAdmins.toString()}
            description={`${userCounts.activeAdmins} active / ${userCounts.inactiveAdmins} inactive`}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
        )}

        {(isMaster || isAdmin) && (
          <StatCard
            title="Total Sub Admins"
            value={userCounts.totalSubAdmins.toString()}
            description={`${userCounts.activeSubAdmins} active / ${userCounts.inactiveSubAdmins} inactive`}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
        )}

        <StatCard
          title="Today Inward Count"
          value={todayCounts.todayInwardCount.toString()}
          description="From inward vouchers"
          icon={<ArrowDownRight className="h-4 w-4 text-muted-foreground" />}
        />

        <StatCard
          title="Today Outward Count"
          value={todayCounts.todayOutwardCount.toString()}
          description="From outward vouchers"
          icon={<ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
        />

        <StatCard
          title="Total Stock"
          value={stock.totalQuantity.toLocaleString()}
          description={`${Math.round(stock.totalWeight).toLocaleString()} kg weight`}
          icon={<Archive className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Block Stock Details Modal */}
      <BlockStockDetailsModal
        open={!!selectedBlock}
        onOpenChange={handleCloseBlockDetail}
        stockDetails={stockDetails}
      />

      {/* Chamber Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle>Chamber Occupancy (MT-based)</CardTitle>
        </CardHeader>
        <CardContent>
          {!warehouseMetrics || warehouseMetrics.chambers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {warehouseMetrics ? 'No chambers found.' : 'Room configuration required for MT-based occupancy.'}
            </p>
          ) : (
            <div className="space-y-4">
              {warehouseMetrics.chambers.map((chamber) => (
                <ChamberOccupancyCard
                  key={chamber.chamberId}
                  chamber={chamber}
                  isExpanded={expandedChambers.has(chamber.chamberId)}
                  onToggle={() => toggleChamber(chamber.chamberId)}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={handleSelectRoom}
                  onBackToRooms={handleBackToRooms}
                  onBlockClick={handleBlockClick}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
