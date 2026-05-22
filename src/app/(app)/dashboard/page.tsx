'use client';

import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-context';
import {
  getChamberOccupancy,
  getTodayCounts,
  getTotalStock,
  getUserCounts,
  type TodayCounts,
  type TotalStock,
  type UserCounts,
  type ChamberOccupancyRow,
} from '@/lib/dashboard-metrics';

import { Archive, ArrowDownRight, ArrowUpRight, Users, Warehouse, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useUser();

  const [todayCounts, setTodayCounts] = useState<TodayCounts>({ todayInwardCount: 0, todayOutwardCount: 0 });
  const [stock, setStock] = useState<TotalStock>({ totalQuantity: 0, totalWeight: 0 });
  const [userCounts, setUserCounts] = useState<UserCounts>({ totalAdmins: 0, activeAdmins: 0, inactiveAdmins: 0, totalSubAdmins: 0, activeSubAdmins: 0, inactiveSubAdmins: 0 });
  const [chamberRows, setChamberRows] = useState<ChamberOccupancyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [tc, st, uc, cr] = await Promise.all([
          getTodayCounts(),
          getTotalStock(),
          getUserCounts(),
          getChamberOccupancy(),
        ]);
        setTodayCounts(tc);
        setStock(st);
        setUserCounts(uc);
        setChamberRows(cr);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  const occupancyTotals = (() => {
    const capacityVolume = chamberRows.reduce((acc, row) => acc + row.capacityVolume, 0);
    const usedVolume = chamberRows.reduce((acc, row) => acc + row.usedVolume, 0);
    const occupiedPercent = capacityVolume > 0 ? Math.round((usedVolume / capacityVolume) * 1000) / 10 : 0;
    return { capacityVolume, usedVolume, occupiedPercent };
  })();

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Warehouse Occupancy"
          value={`${occupancyTotals.occupiedPercent}%`}
          description={`${Math.round(occupancyTotals.usedVolume).toLocaleString()} / ${Math.round(occupancyTotals.capacityVolume).toLocaleString()} vol occupied`}
          icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
        />

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

        {isMaster && (
          <StatCard
            title="Active Admins"
            value={userCounts.activeAdmins.toString()}
            description="Enabled admin accounts"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
        )}

        {isAdmin && (
          <StatCard
            title="Active Sub Admins"
            value={userCounts.activeSubAdmins.toString()}
            description="Enabled sub admin accounts"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chamber Occupancy Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {chamberRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chambers found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {chamberRows.map((row) => {
                const barClass =
                  row.occupancyStatus === 'LOW'
                    ? 'bg-green-500'
                    : row.occupancyStatus === 'MEDIUM'
                    ? 'bg-yellow-500'
                    : 'bg-red-500';

                return (
                  <Card key={row.chamberId} className="shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{row.chamberName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Used</span>
                        <span className="font-mono">{Math.round(row.usedVolume).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Capacity</span>
                        <span className="font-mono">{Math.round(row.capacityVolume).toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
                        <div className={`h-full ${barClass}`} style={{ width: `${row.occupiedPercent}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Occupied</span>
                        <span className="font-semibold">{Math.round(row.occupiedPercent)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Empty</span>
                        <span className="font-semibold">{Math.round(row.emptyPercent)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
