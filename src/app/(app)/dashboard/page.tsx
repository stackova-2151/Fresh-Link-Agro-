import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { rentalItems, gatePasses, chambers, users, vendors, clients } from "@/lib/data";
import { AlertCircle, Archive, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Truck, Warehouse, Users, UserPlus, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardPage() {
    const expiringSoonCount = rentalItems.filter(item => {
        const today = new Date();
        const expiry = item.expiryDate;
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 7;
    }).length;

    const onPremisesCount = gatePasses.filter(gp => gp.status === 'On-Premises').length;

    const totalCapacity = chambers.reduce((acc, chamber) => acc + (chamber.boxDimensions ? chamber.boxDimensions.length * chamber.boxDimensions.width * chamber.boxDimensions.height : 0), 0);
    const totalOccupied = 0; // This needs to be calculated based on items in chambers
    const occupancyPercentage = totalCapacity > 0 ? (totalOccupied / totalCapacity * 100).toFixed(1) : 0;

    const recentActivity = [
        { user: "Alex", action: "approved Gate Pass", subject: "GP-2407-003", time: "5m ago", avatar: "https://picsum.photos/seed/alex/32/32" },
        { user: "Maria", action: "added new stock for", subject: "Fresh Strawberries", time: "1h ago", avatar: "https://picsum.photos/seed/maria/32/32" },
        { user: "System", action: "flagged temperature anomaly in", subject: "Chiller A-1", time: "2h ago", avatar: "" },
        { user: "Chen", action: "checked out vehicle", subject: "KA05 CD5678", time: "3h ago", avatar: "https://picsum.photos/seed/chen/32/32" },
    ];
    
    return (
        <div className="space-y-6">
            <PageHeader title="Dashboard" description={`Welcome back! Here's what's happening today.`} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Warehouse Occupancy"
                    value={`${occupancyPercentage}%`}
                    description={`${(totalOccupied/1000000).toLocaleString()} / ${(totalCapacity/1000000).toLocaleString()} m³ occupied`}
                    icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
                />
                <StatCard 
                    title="Vehicles On-Premises"
                    value={onPremisesCount.toString()}
                    description="+1 since last hour"
                    icon={<Truck className="h-4 w-4 text-muted-foreground" />}
                />
                <StatCard 
                    title="Items Expiring Soon"
                    value={expiringSoonCount.toString()}
                    description="In the next 7 days"
                    icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
                />
                 <StatCard 
                    title="Total Clients"
                    value={clients.length.toString()}
                    description="Active clients"
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Gate Passes</CardTitle>
                        <CardDescription>A log of the most recent vehicle movements.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vehicle No.</TableHead>
                                    <TableHead>Client/Vendor</TableHead>
                                    <TableHead className="text-center">Type</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gatePasses.slice(0, 5).map(pass => (
                                    <TableRow key={pass.id}>
                                        <TableCell className="font-medium">{pass.vehicleNumber}</TableCell>
                                        <TableCell>{pass.clientName}</TableCell>
                                        <TableCell className="text-center">
                                            {pass.type === 'IN' ? <ArrowDownRight className="h-5 w-5 mx-auto text-green-500" /> : <ArrowUpRight className="h-5 w-5 mx-auto text-red-500" />}
                                        </TableCell>
                                        <TableCell>{pass.exitTime ? new Date(pass.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(pass.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={pass.status === 'Completed' ? 'secondary' : 'default'} className={
                                                pass.status === 'On-Premises' ? 'bg-primary/10 text-primary' : 
                                                pass.status === 'Completed' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                                            }>
                                                {pass.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentActivity.map((activity, index) => (
                             <div key={index} className="flex items-start gap-4">
                                <Avatar className="h-9 w-9">
                                    {activity.avatar && <AvatarImage src={activity.avatar} alt="Avatar" />}
                                    <AvatarFallback>{activity.user.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">
                                        <span className="font-semibold">{activity.user}</span> {activity.action} <span className="font-semibold">{activity.subject}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
