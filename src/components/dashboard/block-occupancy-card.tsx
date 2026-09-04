import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { BlockOccupancy } from '@/lib/types/room-block';

interface BlockOccupancyCardProps {
  block: BlockOccupancy;
  onClick?: () => void;
}

/** Dot color class — kept in sync with status thresholds below. */
export function getBlockDotColor(percent: number): string {
  if (percent === 0)   return 'bg-gray-300';
  if (percent < 50)    return 'bg-teal-400';
  if (percent <= 85)   return 'bg-amber-400';
  return 'bg-red-500';
}

/** Returns { cardClass, textColor } driven by the same thresholds as the dot. */
function getBlockStatus(percent: number): { cardClass: string; textColor: string } {
  if (percent === 0)   return { cardClass: 'status-card--empty',    textColor: 'hsl(var(--muted-foreground))' };
  if (percent < 50)    return { cardClass: 'status-card--normal',   textColor: '#0F6E56' };
  if (percent <= 85)   return { cardClass: 'status-card--near-full', textColor: '#B87503' };
  return               { cardClass: 'status-card--full',    textColor: '#B42318' };
}

export function BlockOccupancyCard({ block, onClick }: BlockOccupancyCardProps) {
  const isEmpty  = block.occupiedMT === 0;
  const dotColor = getBlockDotColor(block.occupancyPercent);
  const { cardClass, textColor } = getBlockStatus(block.occupancyPercent);

  return (
    <Card
      className={`cursor-pointer ${cardClass}`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold">{block.blockName}</span>
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        </div>

        {/* MT values */}
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span>{block.occupiedMT.toFixed(2)} MT</span>
          <span className="mx-1">/</span>
          <span>{block.capacityMT.toFixed(2)} MT</span>
        </div>

        {/* Progress bar — always rendered for visual rhythm */}
        <Progress value={Math.min(block.occupancyPercent, 100)} />

        {/* Percentage / Empty label — status-colored */}
        <div className="text-xs font-medium" style={{ color: textColor }}>
          {isEmpty ? 'Empty' : `${block.occupancyPercent.toFixed(1)}%`}
        </div>
      </CardContent>
    </Card>
  );
}
