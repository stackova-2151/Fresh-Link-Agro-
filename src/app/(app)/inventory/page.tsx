
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rentalItems } from "@/lib/data";
import { PlusCircle, Search } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils";

export default function InventoryPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Inventory" description="Manage your rental food items.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle>Rental Items</CardTitle>
                    <CardDescription>A list of all food items available for rent.</CardDescription>
                    <div className="relative pt-2">
                        <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search for items..." className="pl-8" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Available Qty</TableHead>
                                <TableHead>Condition</TableHead>
                                <TableHead>Expiry Date</TableHead>
                                <TableHead>Temp. Range</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rentalItems.map(item => {
                                const isExpiringSoon = (item.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30;
                                const isExpired = item.expiryDate.getTime() < new Date().getTime();

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                                <Image 
                                                    src={`https://picsum.photos/seed/${item.id}/100/100`}
                                                    width={48}
                                                    height={48}
                                                    alt={item.name}
                                                    className="object-cover"
                                                    data-ai-hint="food item"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell>{item.quantityAvailable} {item.unit}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.condition === 'New' ? 'default' : 'secondary'}>{item.condition}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(isExpiringSoon && 'text-orange-500', isExpired && 'text-red-500 font-semibold')}>
                                                {item.expiryDate.toLocaleDateString()}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.temperatureRange}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                                <DropdownMenuItem>View History</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
