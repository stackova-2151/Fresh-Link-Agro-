import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Warehouse, Layers, Building2 } from 'lucide-react';
import type { WarehouseMetrics } from '@/lib/dashboard-metrics';

interface WarehouseSummaryProps {
  metrics: WarehouseMetrics;
}

export function WarehouseSummary({ metrics }: WarehouseSummaryProps) {
  const getOccupancyColor = (percent: number) => {
    if (percent < 25) return 'bg-green-500';
    if (percent < 50) return 'bg-yellow-500';
    if (percent < 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Hero card — teal-900 filled */}
      <Card className="bg-teal-900 border-teal-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Warehouse className="h-4 w-4 text-teal-200" />
            <span className="text-sm font-medium text-teal-100">Warehouse Occupancy</span>
          </div>
          <div className="text-2xl font-bold mb-1 text-white">{metrics.occupancyPercent.toFixed(2)}%</div>
          <div className="text-xs text-teal-100 mb-2">
            {metrics.occupiedMT.toFixed(2)} / {metrics.totalCapacityMT.toFixed(2)} MT
          </div>
          <Progress value={Math.min(metrics.occupancyPercent, 100)} />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-teal-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-muted-foreground">Total Chambers</span>
          </div>
          <div className="text-2xl font-bold mb-1">{metrics.totalChambers}</div>
          <div className="text-xs text-muted-foreground">
            {metrics.totalRooms} Rooms • {metrics.totalBlocks} Blocks
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-teal-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-muted-foreground">Warehouse Capacity</span>
          </div>
          <div className="text-2xl font-bold mb-1">{metrics.totalCapacityMT.toFixed(2)} MT</div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-teal-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Warehouse className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-muted-foreground">Occupied Space</span>
          </div>
          <div className="text-2xl font-bold mb-1">{metrics.occupiedMT.toFixed(2)} MT</div>
          <div className="text-xs text-muted-foreground">
            {metrics.availableMT.toFixed(2)} MT Free
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
