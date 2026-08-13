'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import type { Room } from '@/lib/types/room-block';
import { generateBlocks } from '@/lib/utils/room-block';

interface RoomConfigProps {
  rooms: Room[];
  onRoomsChange: (rooms: Room[]) => void;
}

export function RoomConfig({ rooms, onRoomsChange }: RoomConfigProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');

  const handleAddRoom = () => {
    const capacity = parseFloat(newRoomCapacity);
    
    // Validation
    if (!newRoomName.trim()) {
      alert('Room name is required');
      return;
    }
    if (isNaN(capacity) || capacity <= 0) {
      alert('Room capacity must be greater than 0');
      return;
    }
    if (rooms.some(r => r.roomName.toLowerCase() === newRoomName.trim().toLowerCase())) {
      alert('Room name must be unique within this chamber');
      return;
    }

    // Generate stable roomId based on room name and timestamp
    const timestamp = Date.now();
    const roomId = `room_${newRoomName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}`;
    const newRoom: Room = {
      roomId,
      roomName: newRoomName.trim(),
      totalCapacityMT: capacity,
      blocks: generateBlocks(roomId, capacity),
    };

    onRoomsChange([...rooms, newRoom]);
    setNewRoomName('');
    setNewRoomCapacity('');
  };

  const handleRemoveRoom = (roomId: string) => {
    onRoomsChange(rooms.filter(r => r.roomId !== roomId));
  };

  const handleUpdateRoom = (roomId: string, field: 'roomName' | 'totalCapacityMT', value: string | number) => {
    const updatedRooms = rooms.map(room => {
      if (room.roomId !== roomId) return room;

      if (field === 'totalCapacityMT') {
        const capacity = parseFloat(value as string);
        if (isNaN(capacity) || capacity <= 0) return room;
        
        // Regenerate blocks with new capacity
        return {
          ...room,
          totalCapacityMT: capacity,
          blocks: generateBlocks(room.roomId, capacity),
        };
      }

      if (field === 'roomName') {
        const newName = (value as string).trim();
        if (!newName) return room;
        if (rooms.some(r => r.roomId !== roomId && r.roomName.toLowerCase() === newName.toLowerCase())) {
          return room; // Don't allow duplicate names
        }
        return { ...room, roomName: newName };
      }

      return room;
    });

    onRoomsChange(updatedRooms);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Rooms Configuration</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRoom}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
      </div>

      {/* Add Room Form */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newRoomName">Room Name</Label>
              <Input
                id="newRoomName"
                placeholder="e.g., 1-G, 1A, 1B"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRoomCapacity">Capacity (MT)</Label>
              <Input
                id="newRoomCapacity"
                type="number"
                placeholder="e.g., 150"
                value={newRoomCapacity}
                onChange={(e) => setNewRoomCapacity(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No rooms configured. Add a room to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <Card key={room.roomId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`room-name-${room.roomId}`} className="text-xs">Room Name</Label>
                      <Input
                        id={`room-name-${room.roomId}`}
                        value={room.roomName}
                        onChange={(e) => handleUpdateRoom(room.roomId, 'roomName', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`room-capacity-${room.roomId}`} className="text-xs">Capacity (MT)</Label>
                      <Input
                        id={`room-capacity-${room.roomId}`}
                        type="number"
                        value={room.totalCapacityMT}
                        onChange={(e) => handleUpdateRoom(room.roomId, 'totalCapacityMT', e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRoom(room.roomId)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground mb-2">
                  8 Blocks (A-H) • {room.totalCapacityMT / 8} MT per block
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {room.blocks.map((block) => (
                    <div key={block.blockId} className="bg-muted p-1.5 rounded text-center">
                      <div className="font-medium">{block.blockName}</div>
                      <div className="text-muted-foreground">{block.capacityMT.toFixed(2)} MT</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
