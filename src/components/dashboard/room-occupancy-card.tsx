import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import type { RoomOccupancy } from '@/lib/types/room-block';

interface RoomOccupancyCardProps {
  room: RoomOccupancy;
  onViewBlocks: (roomId: string) => void;
}

export function RoomOccupancyCard({ room, onViewBlocks }: RoomOccupancyCardProps) {
  const occupiedBlocks = room.blocks.filter(b => b.occupiedMT > 0).length;
  const totalBlocks = room.blocks.length;

  const getOccupancyColor = (percent: number) => {
    if (percent < 25) return 'bg-green-500';
    if (percent < 50) return 'bg-yellow-500';
    if (percent < 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{room.roomName}</h3>
          <span className="text-xs text-muted-foreground">
            {occupiedBlocks}/{totalBlocks} Blocks
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Occupied</span>
            <span className="font-mono font-medium">{room.occupiedMT.toFixed(2)} MT</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-mono font-medium">{room.totalCapacityMT.toFixed(2)} MT</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className="font-mono font-medium">{room.availableMT.toFixed(2)} MT</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Occupancy</span>
            <span className="font-mono font-semibold">{room.occupancyPercent.toFixed(2)}%</span>
          </div>
          <Progress 
            value={Math.min(room.occupancyPercent, 100)} 
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onViewBlocks(room.roomId)}
        >
          View Blocks
          <ChevronRight className="ml-2 h-4 w-4 icon-nudge" />
        </Button>
      </CardContent>
    </Card>
  );
}
