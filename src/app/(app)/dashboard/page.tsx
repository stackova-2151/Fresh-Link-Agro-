"use client";

import { useMemo } from "react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/context/user-context";
import { getChamberOccupancy, getTodayCounts, getTotalStock, getUserCounts } from "@/lib/dashboard-metrics";

import { Archive, ArrowDownRight, ArrowUpRight, Users, Warehouse } from "lucide-react";

export default function DashboardPage() {
    const { user } = useUser();

    const todayCounts = useMemo(() => getTodayCounts(), []);
    const stock = useMemo(() => getTotalStock(), []);
    const userCounts = useMemo(() => getUserCounts(), []);
    const chamberRows = useMemo(() => getChamberOccupancy(), []);

    const occupancyTotals = useMemo(() => {
        const capacityVolume = chamberRows.reduce((acc, row) => acc + row.capacityVolume, 0);
        const usedVolume = chamberRows.reduce((acc, row) => acc + row.usedVolume, 0);
        const occupiedPercent = capacityVolume > 0 ? Math.round((usedVolume / capacityVolume) * 1000) / 10 : 0;
        return { capacityVolume, usedVolume, occupiedPercent };
    }, [chamberRows]);

    const role = user?.role;

    const isMaster = role === 'MASTER_ADMIN';
    const isAdmin = role === 'ADMIN';
    const isSubAdmin = role === 'SUB_ADMIN';

    const showUserAdminStats = isMaster;
    const showUserSubAdminStats = isMaster || isAdmin;

    return (
        <div className="space-y-6">
            <PageHeader title="Dashboard" description={`Welcome back! Here's what's happening today.`} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Warehouse Occupancy"
                    value={`${occupancyTotals.occupiedPercent}%`}
                    description={`${Math.round(occupancyTotals.usedVolume).toLocaleString()} / ${Math.round(occupancyTotals.capacityVolume).toLocaleString()} vol occupied`}
                    icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
                />

                {showUserAdminStats && (
                    <StatCard
                        title="Total Admins"
                        value={userCounts.totalAdmins.toString()}
                        description={`${userCounts.activeAdmins} active / ${userCounts.inactiveAdmins} inactive`}
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    />
                )}

                {showUserSubAdminStats && (
                    <StatCard
                        title="Total Sub Admins"
                        value={userCounts.totalSubAdmins.toString()}
                        description={`${userCounts.activeSubAdmins} active / ${userCounts.inactiveSubAdmins} inactive`}
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    />
                )}

                {(isMaster || isAdmin || isSubAdmin) && (
                    <StatCard
                        title="Today Inward Count"
                        value={todayCounts.todayInwardCount.toString()}
                        description="From inward vouchers"
                        icon={<ArrowDownRight className="h-4 w-4 text-muted-foreground" />}
                    />
                )}

                {(isMaster || isAdmin || isSubAdmin) && (
                    <StatCard
                        title="Today Outward Count"
                        value={todayCounts.todayOutwardCount.toString()}
                        description="From outward vouchers"
                        icon={<ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                    />
                )}

                {(isMaster || isAdmin || isSubAdmin) && (
                    <StatCard
                        title="Total Stock"
                        value={stock.totalQuantity.toLocaleString()}
                        description={`${Math.round(stock.totalWeight).toLocaleString()} kg weight`}
                        icon={<Archive className="h-4 w-4 text-muted-foreground" />}
                    />
                )}

                {isMaster && (
                    <StatCard
                        title="Active Admins"
                        value={userCounts.activeAdmins.toString()}
                        description="Enabled admin accounts"
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    />
                )}

                {isMaster && (
                    <StatCard
                        title="Inactive Admins"
                        value={userCounts.inactiveAdmins.toString()}
                        description="Disabled admin accounts"
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

                {isAdmin && (
                    <StatCard
                        title="Inactive Sub Admins"
                        value={userCounts.inactiveSubAdmins.toString()}
                        description="Disabled sub admin accounts"
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    />
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Chamber Occupancy Overview</CardTitle>
                </CardHeader>
                <CardContent>
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
                                            <div
                                                className={`h-full ${barClass}`}
                                                style={{ width: `${row.occupiedPercent}%` }}
                                            />
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
                </CardContent>
            </Card>
        </div>
    );
}
