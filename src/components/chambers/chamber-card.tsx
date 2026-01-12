import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Chamber } from "@/lib/types";
import { Thermometer, Box, MoreHorizontal, Scaling } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AddChamberDialog } from "./add-chamber-dialog";

type ChamberCardProps = {
    chamber: Chamber;
    onEdit: (chamber: Chamber) => void;
    onDelete: (chamber: Chamber) => void;
    onChamberUpdated: (chamber: Chamber) => void;
};

export function ChamberCard({ chamber, onEdit, onDelete, onChamberUpdated }: ChamberCardProps) {
    const occupancyPercentage = 0;
    const capacity = chamber.boxDimensions ? (chamber.boxDimensions.length * chamber.boxDimensions.width * chamber.boxDimensions.height / 1000000).toFixed(2) : 0;
    const occupied = 0;

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
                                    onClick={() => onDelete(chamber)}
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <CardDescription>Capacity: {capacity} m³</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Occupancy</span>
                        <span className="text-sm text-muted-foreground">{occupancyPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={occupancyPercentage} />
                    <p className="text-xs text-muted-foreground mt-1">{occupied.toLocaleString()} m³ used</p>
                </div>
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
                 {chamber.boxDimensions && (chamber.boxDimensions.length > 0 || chamber.boxDimensions.width > 0 || chamber.boxDimensions.height > 0) && <div className="flex items-center gap-2 text-sm">
                    <Scaling className="h-4 w-4 text-muted-foreground" />
                    <span>{chamber.boxDimensions.length}x{chamber.boxDimensions.width}x{chamber.boxDimensions.height} cm</span>
                </div>}
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">Daily Rate: ₹{chamber.dailyRentRate?.toLocaleString() || 'N/A'}</p>
            </CardFooter>
        </Card>
    );
}
