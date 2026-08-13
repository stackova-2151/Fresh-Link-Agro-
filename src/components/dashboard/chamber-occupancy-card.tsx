import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import type { ChamberOccupancy, BlockOccupancy } from '@/lib/types/room-block';
import { RoomOccupancyCard } from './room-occupancy-card';
import { BlockOccupancyCard } from './block-occupancy-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ChamberOccupancyCardProps {
  chamber: ChamberOccupancy;
  isExpanded: boolean;
  onToggle: () => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onBackToRooms: () => void;
  onBlockClick: (block: BlockOccupancy, roomName: string) => void;
}

export function ChamberOccupancyCard({ 
  chamber, 
  isExpanded, 
  onToggle,
  selectedRoomId,
  onSelectRoom,
  onBackToRooms,
  onBlockClick
}: ChamberOccupancyCardProps) {
  const getOccupancyColor = (percent: number) => {
    if (percent < 25) return 'bg-green-500';
    if (percent < 50) return 'bg-yellow-500';
    if (percent < 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const selectedRoom = chamber.rooms.find(r => r.roomId === selectedRoomId);

  return (
    <Card className="shadow-sm">
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{chamber.chamberName}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {chamber.occupancyPercent.toFixed(2)}%
            </span>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Chamber Metrics */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Capacity</span>
              <div className="font-mono font-semibold">{chamber.totalCapacityMT.toFixed(2)} MT</div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Occupied</span>
              <div className="font-mono font-semibold">{chamber.occupiedMT.toFixed(2)} MT</div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Available</span>
              <div className="font-mono font-semibold">{chamber.availableMT.toFixed(2)} MT</div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Rooms</span>
              <div className="font-mono font-semibold">{chamber.rooms.length}</div>
            </div>
          </div>

          <Progress 
            value={Math.min(chamber.occupancyPercent, 100)} 
            className="h-2"
          />

          {/* Room View or Block View */}
          {selectedRoomId && selectedRoom ? (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{selectedRoom.roomName}</h4>
                  <span className="text-xs text-muted-foreground">
                    {selectedRoom.occupiedMT.toFixed(2)} / {selectedRoom.totalCapacityMT.toFixed(2)} MT
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={onBackToRooms}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Rooms
                </Button>
              </div>

              <Progress 
                value={Math.min(selectedRoom.occupancyPercent, 100)} 
                className="h-1.5"
              />

              {/* Block Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedRoom.blocks.map((block) => (
                  <BlockOccupancyCard 
                    key={block.blockId} 
                    block={block}
                    onClick={() => onBlockClick(block, selectedRoom.roomName)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {chamber.rooms.map((room) => (
                  <RoomOccupancyCard 
                    key={room.roomId} 
                    room={room}
                    onViewBlocks={onSelectRoom}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
