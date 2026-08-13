import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Chamber } from "@/lib/types";
import { Thermometer, Box, MoreHorizontal, Scaling, Layers, Warehouse } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AddChamberDialog } from "./add-chamber-dialog";
import { occupancyService } from "@/lib/services/occupancy.service";
import type { RentalItem } from "@/lib/types";

type ChamberCardProps = {
    chamber: Chamber;
    onEdit: (chamber: Chamber) => void;
    onDelete: (chamber: Chamber) => void;
    onChamberUpdated: (chamber: Chamber) => void;
    rentalItems?: RentalItem[];
};

export function ChamberCard({ chamber, onEdit, onDelete, onChamberUpdated, rentalItems = [] }: ChamberCardProps) {
    // Calculate MT-based occupancy using occupancy service
    const chamberOccupancy = occupancyService.calculateChamberOccupancy(chamber, rentalItems);
    
    // Legacy volume-based capacity (for backward compatibility)
    const capacityVolume = chamber.boxDimensions ? (chamber.boxDimensions.length * chamber.boxDimensions.width * chamber.boxDimensions.height / 1000000).toFixed(2) : 0;
    
    // Room-based capacity
    const totalRoomCapacityMT = chamber.rooms?.reduce((sum, room) => sum + room.totalCapacityMT, 0) || 0;
    const hasRooms = chamber.rooms && chamber.rooms.length > 0;
    const totalBlocks = chamber.rooms?.reduce((sum, room) => sum + room.blocks.length, 0) || 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline">{chamber.name}</CardTitle>
                    <div className="flex items-center gap-1">
                        <Badge variant={chamber.isActive ? "default" : "destructive"} className={chamber.isActive ? "bg-green-100 text-green-800" : ""}>
                            {chamber.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <AddChamberDialog 
                                    chamber={chamber}
                                    onChamberAdded={onChamberUpdated}
                                    trigger={
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            Edit
                                        </DropdownMenuItem>
                                    }
                                />
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-destructive" 
                                    onSelect={() => {
                                        // Defer onDelete to allow Radix DropdownMenu to complete
                                        // its close/focus restoration cycle before AlertDialog opens
                                        requestAnimationFrame(() => {
                                            onDelete(chamber);
                                        });
                                    }}
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <CardDescription>
                    {hasRooms 
                        ? `${totalRoomCapacityMT.toFixed(2)} MT • ${chamber.rooms!.length} Rooms • ${totalBlocks} Blocks`
                        : `Capacity: ${capacityVolume} m³`
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {hasRooms ? (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Occupancy</span>
                            <span className="text-sm text-muted-foreground">{chamberOccupancy.occupancyPercent.toFixed(1)}%</span>
                        </div>
                        <Progress value={chamberOccupancy.occupancyPercent} />
                        <p className="text-xs text-muted-foreground mt-1">
                            {chamberOccupancy.occupiedMT.toFixed(2)} MT / {chamberOccupancy.totalCapacityMT.toFixed(2)} MT
                        </p>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Occupancy</span>
                            <span className="text-sm text-muted-foreground">N/A</span>
                        </div>
                        <Progress value={0} />
                        <p className="text-xs text-muted-foreground mt-1">Room configuration required for MT-based occupancy</p>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        <span>{chamber.temperature}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-muted-foreground" />
                        <span>{chamber.products.length} Items</span>
                    </div>
                </div>
                {chamber.boxDimensions && (chamber.boxDimensions.length > 0 || chamber.boxDimensions.width > 0 || chamber.boxDimensions.height > 0) && (
                    <div className="flex items-center gap-2 text-sm">
                        <Scaling className="h-4 w-4 text-muted-foreground" />
                        <span>{chamber.boxDimensions.length}x{chamber.boxDimensions.width}x{chamber.boxDimensions.height} cm</span>
                    </div>
                )}
            </CardContent>
            {/* <CardFooter>
                <p className="text-xs text-muted-foreground">Daily Rate: ₹{chamber.dailyRentRate?.toLocaleString() || 'N/A'}</p>
            </CardFooter> */}
        </Card>
    );
}
