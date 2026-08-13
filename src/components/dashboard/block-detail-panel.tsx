import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X, Package } from 'lucide-react';
import type { BlockOccupancy } from '@/lib/types/room-block';

interface BlockDetailPanelProps {
  block: BlockOccupancy | null;
  roomName: string;
  onClose: () => void;
}

export function BlockDetailPanel({ block, roomName, onClose }: BlockDetailPanelProps) {
  if (!block) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Empty': return 'bg-green-500';
      case 'Available': return 'bg-green-400';
      case 'Moderate': return 'bg-yellow-400';
      case 'High': return 'bg-orange-400';
      case 'Near Full': return 'bg-red-400';
      case 'Full': return 'bg-red-600';
      default: return 'bg-gray-400';
    }
  };

  const getOccupancyColor = (percent: number) => {
    if (percent < 25) return 'bg-green-500';
    if (percent < 50) return 'bg-yellow-500';
    if (percent < 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Block {block.blockName} Details
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Room</span>
            <div className="font-medium">{roomName}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(block.status)}`} />
              <span className="font-medium">{block.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Capacity</span>
            <div className="font-mono font-medium">{block.capacityMT.toFixed(2)} MT</div>
          </div>
          <div>
            <span className="text-muted-foreground">Occupied</span>
            <div className="font-mono font-medium">{block.occupiedMT.toFixed(2)} MT</div>
          </div>
          <div>
            <span className="text-muted-foreground">Available</span>
            <div className="font-mono font-medium">{block.availableMT.toFixed(2)} MT</div>
          </div>
          <div>
            <span className="text-muted-foreground">Occupancy</span>
            <div className="font-mono font-medium">{block.occupancyPercent.toFixed(2)}%</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Occupancy Progress</span>
            <span className="font-mono font-medium">{block.occupancyPercent.toFixed(2)}%</span>
          </div>
          <Progress 
            value={Math.min(block.occupancyPercent, 100)} 
            className={`h-2 ${getOccupancyColor(block.occupancyPercent)}`}
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
          <Package className="h-4 w-4" />
          <span>Items stored in this block</span>
        </div>
      </CardContent>
    </Card>
  );
}
