import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { BlockOccupancy } from '@/lib/types/room-block';

interface BlockOccupancyCardProps {
  block: BlockOccupancy;
  onClick?: () => void;
}

export function BlockOccupancyCard({ block, onClick }: BlockOccupancyCardProps) {
  const isEmpty = block.occupiedMT === 0;
  const isFull = block.occupancyPercent >= 95;

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
    <Card 
      className={`hover:shadow-md transition-shadow cursor-pointer ${isEmpty ? 'bg-muted/30' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold">{block.blockName}</span>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(block.status)}`} />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {block.occupiedMT.toFixed(2)} MT
          </div>
          <div className="text-xs text-muted-foreground">
            / {block.capacityMT.toFixed(2)} MT
          </div>
        </div>

        {!isEmpty && (
          <>
            <Progress 
              value={Math.min(block.occupancyPercent, 100)} 
              className="h-1"
            />
            <div className="text-xs font-medium text-muted-foreground">
              {block.occupancyPercent.toFixed(1)}%
            </div>
          </>
        )}

        {isEmpty && (
          <div className="text-xs font-medium text-muted-foreground">
            Empty
          </div>
        )}
      </CardContent>
    </Card>
  );
}
