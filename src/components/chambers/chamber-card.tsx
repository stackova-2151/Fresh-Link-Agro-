import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Chamber } from "@/lib/types";
import { Thermometer, Box } from "lucide-react";
import { Badge } from "../ui/badge";

type ChamberCardProps = {
    chamber: Chamber;
};

export function ChamberCard({ chamber }: ChamberCardProps) {
    const occupancyPercentage = chamber.capacity > 0 ? (chamber.occupied / chamber.capacity) * 100 : 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline">{chamber.name}</CardTitle>
                    <Badge variant={chamber.isActive ? "default" : "destructive"} className={chamber.isActive ? "bg-green-100 text-green-800" : ""}>
                        {chamber.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
                <CardDescription>Capacity: {chamber.capacity} kg</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Occupancy</span>
                        <span className="text-sm text-muted-foreground">{occupancyPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={occupancyPercentage} />
                    <p className="text-xs text-muted-foreground mt-1">{chamber.occupied.toLocaleString()} kg used</p>
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
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">Daily Rate: ₹{chamber.dailyRentRate?.toLocaleString() || 'N/A'}</p>
            </CardFooter>
        </Card>
    );
}
