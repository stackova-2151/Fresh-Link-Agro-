import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, Building2, ChevronRight } from 'lucide-react';
import type { ChamberOccupancy, BlockOccupancy } from '@/lib/types/room-block';
import { RoomOccupancyCard } from './room-occupancy-card';
import { BlockOccupancyCard } from './block-occupancy-card';

interface ChamberOccupancyCardProps {
  chamber: ChamberOccupancy;
  isExpanded: boolean;
  onToggle: () => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onBackToRooms: () => void;
  onBlockClick: (block: BlockOccupancy, roomName: string, chamberId: string, chamberName: string) => void;
}

/** Inline legend shown above the block grid. */
function BlockLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-gray-300" />Empty</span>
      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-teal-400" />Normal</span>
      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400" />Near full</span>
      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" />Full</span>
    </div>
  );
}

export function ChamberOccupancyCard({
  chamber,
  isExpanded,
  onToggle,
  selectedRoomId,
  onSelectRoom,
  onBackToRooms,
  onBlockClick,
}: ChamberOccupancyCardProps) {
  const selectedRoom = chamber.rooms.find(r => r.roomId === selectedRoomId);

  return (
    <Card className="shadow-sm">
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-teal-600" />
            <CardTitle className="text-base">{chamber.chamberName}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {chamber.occupancyPercent.toFixed(2)}%
            </span>
          </div>
          {/* Single chevron that rotates 180° when expanded */}
          <ChevronDown
            className="h-4 w-4 chevron-rotate"
            data-open={isExpanded ? 'true' : 'false'}
          />
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

          <Progress value={Math.min(chamber.occupancyPercent, 100)} />

          {/* Room View or Block View */}
          {selectedRoomId && selectedRoom ? (
            <div className="space-y-4 pt-4 border-t">
              {/* Breadcrumb nav */}
              <nav className="flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={onBackToRooms}
                  className="hover:text-teal-600 transition-colors"
                >
                  {chamber.chamberName}
                </button>
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                <span className="text-teal-800 font-medium">{selectedRoom.roomName}</span>
              </nav>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {selectedRoom.occupiedMT.toFixed(2)} / {selectedRoom.totalCapacityMT.toFixed(2)} MT
                </span>
                <span className="text-xs font-medium text-teal-800">
                  {selectedRoom.occupancyPercent.toFixed(2)}%
                </span>
              </div>

              <Progress value={Math.min(selectedRoom.occupancyPercent, 100)} />

              {/* Legend + Block Grid */}
              <div className="space-y-2">
                <BlockLegend />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedRoom.blocks.map((block) => (
                    <BlockOccupancyCard
                      key={block.blockId}
                      block={block}
                      onClick={() => onBlockClick(block, selectedRoom.roomName, chamber.chamberId, chamber.chamberName)}
                    />
                  ))}
                </div>
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
