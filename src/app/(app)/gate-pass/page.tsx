'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Truck, 
  Thermometer, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Printer,
  MoreHorizontal
} from 'lucide-react';
import { gatePasses as initialGatePasses } from '@/lib/data';
import { AddGatePassDialog } from '@/components/gate-pass/add-gate-pass-dialog';
import { ViewGatePassDialog } from '@/components/gate-pass/view-gate-pass-dialog';
import { GatePass } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"

export default function GatePassPage() {
  const [gatePasses, setGatePasses] = useState<GatePass[]>(initialGatePasses);
  const [selectedGatePass, setSelectedGatePass] = useState<GatePass | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { todayIn, todayOut, onPremises } = useMemo(() => {
    const today = new Date().toDateString();
    const todayPasses = gatePasses.filter(gp => 
      new Date(gp.entryTime).toDateString() === today
    );
    
    const inCount = todayPasses.filter(gp => gp.type === 'IN').length;
    const outCount = todayPasses.filter(gp => gp.type === 'OUT').length;
    const onPremisesCount = gatePasses.filter(gp => gp.status === 'On-Premises').length;
    
    return {
        todayIn: inCount,
        todayOut: outCount,
        onPremises: onPremisesCount
    };
  }, [gatePasses]);

  const chartData = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
    return hours.map(hour => {
        const inCount = gatePasses.filter(p => p.type === 'IN' && new Date(p.entryTime).getHours() === hour).length;
        const outCount = gatePasses.filter(p => p.type === 'OUT' && p.exitTime && new Date(p.exitTime).getHours() === hour).length;
        return {
            hour: `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? 'AM' : 'PM'}`,
            IN: inCount,
            OUT: outCount,
        };
    });
  }, [gatePasses]);

  const filteredGatePasses = gatePasses.filter(gp => 
    gp.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gp.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gp.gatePassNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => b.entryTime.getTime() - a.entryTime.getTime());

  const handleViewGatePass = (gatePass: GatePass) => {
    setSelectedGatePass(gatePass);
    setShowViewDialog(true);
  };

  const handleAddGatePass = (newGatePass: GatePass) => {
    setGatePasses(prev => [newGatePass, ...prev]);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Gate Pass Management" description="Monitor vehicle movements and gate operations">
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filter</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <AddGatePassDialog onGatePassAdded={handleAddGatePass} />
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Vehicles In Today" value={todayIn.toString()} description="+2 from yesterday" icon={<ArrowDownRight className="h-4 w-4 text-green-600" />} />
        <StatCard title="Vehicles Out Today" value={todayOut.toString()} description="-1 from yesterday" icon={<ArrowUpRight className="h-4 w-4 text-red-600" />} />
        <StatCard title="On Premises" value={onPremises.toString()} description="3 in docking area" icon={<Truck className="h-4 w-4 text-blue-600" />} />
        <StatCard title="Critical Alerts" value="2" description="Temperature deviations" icon={<AlertCircle className="h-4 w-4 text-orange-600" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Vehicle Traffic</CardTitle>
          <CardDescription>IN vs OUT movements by hour</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={chartData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="hour" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="IN" fill="var(--color-chart-1)" radius={4} />
                    <Bar dataKey="OUT" fill="var(--color-chart-2)" radius={4} />
                </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>All Gate Pass Records</CardTitle>
                    <CardDescription>Complete history of vehicle movements</CardDescription>
                </div>
                <div className="flex gap-2">
                <Input
                    placeholder="Search by vehicle, customer, or pass #..."
                    className="w-full md:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gate Pass #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Temp.</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGatePasses.map((gatePass) => (
                <TableRow key={gatePass.id}>
                  <TableCell className="font-medium">{gatePass.gatePassNumber}</TableCell>
                  <TableCell>{gatePass.customerName}</TableCell>
                  <TableCell>{gatePass.vehicleNumber}</TableCell>
                  <TableCell>
                    <Badge variant={gatePass.type === 'IN' ? 'default' : 'destructive'} className={gatePass.type === 'IN' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {gatePass.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(gatePass.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>{gatePass.driverName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Thermometer className="h-4 w-4 text-muted-foreground" />
                      {gatePass.temperature}°C
                    </div>
                  </TableCell>
                  <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleViewGatePass(gatePass)}>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Print Pass</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedGatePass && (
        <ViewGatePassDialog
          gatePass={selectedGatePass}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
        />
      )}
    </div>
  );
}
