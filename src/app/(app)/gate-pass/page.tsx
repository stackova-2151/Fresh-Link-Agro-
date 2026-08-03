'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Thermometer, AlertCircle, ArrowUpRight, ArrowDownRight, Filter, Download, MoreHorizontal } from 'lucide-react';
import { AddGatePassDialog } from '@/components/gate-pass/add-gate-pass-dialog';
import { ViewGatePassDialog } from '@/components/gate-pass/view-gate-pass-dialog';
import { GatePass } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { gatePassService } from '@/lib/firestore';

export default function GatePassPage() {
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [selectedGatePass, setSelectedGatePass] = useState<GatePass | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const load = async () => {
    try {
      const data = await gatePassService.getAll();
      setGatePasses(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load gate passes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayPasses = gatePasses.filter((gp) => new Date(gp.entryTime).toDateString() === today);
    return {
      todayIn: todayPasses.filter((gp) => gp.type === 'IN').length,
      todayOut: todayPasses.filter((gp) => gp.type === 'OUT').length,
      onPremises: gatePasses.filter((gp) => gp.status === 'On-Premises').length,
    };
  }, [gatePasses]);

  const chartData = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);
    return hours.map((hour) => ({
      hour: `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? 'AM' : 'PM'}`,
      IN: gatePasses.filter((p) => p.type === 'IN' && new Date(p.entryTime).getHours() === hour).length,
      OUT: gatePasses.filter((p) => p.type === 'OUT' && p.exitTime && new Date(p.exitTime).getHours() === hour).length,
    }));
  }, [gatePasses]);

  const filteredGatePasses = gatePasses
    .filter((gp) =>
      gp.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.gatePassNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());

  const handleAddGatePass = async (newGatePass: GatePass) => {
    try {
      await gatePassService.createWithId(newGatePass);
      await load();
      toast({ title: 'Gate pass created' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save gate pass.', variant: 'destructive' });
    }
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
        <StatCard title="Vehicles In Today" value={stats.todayIn.toString()} description="" icon={<ArrowDownRight className="h-4 w-4 text-green-600" />} />
        <StatCard title="Vehicles Out Today" value={stats.todayOut.toString()} description="" icon={<ArrowUpRight className="h-4 w-4 text-red-600" />} />
        <StatCard title="On Premises" value={stats.onPremises.toString()} description="" icon={<Truck className="h-4 w-4 text-blue-600" />} />
        <StatCard title="Critical Alerts" value="0" description="" icon={<AlertCircle className="h-4 w-4 text-orange-600" />} />
      </div>

      <Card>
        <CardHeader><CardTitle>Today's Vehicle Traffic</CardTitle><CardDescription>IN vs OUT movements by hour</CardDescription></CardHeader>
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
            <div><CardTitle>All Gate Pass Records</CardTitle><CardDescription>Complete history of vehicle movements</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gate Pass #</TableHead>
                <TableHead>Client/Vendor</TableHead>
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
                  <TableCell>{gatePass.clientName}</TableCell>
                  <TableCell>{gatePass.vehicleNumber}</TableCell>
                  <TableCell>
                    <Badge variant={gatePass.type === 'IN' ? 'default' : 'destructive'} className={gatePass.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {gatePass.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(gatePass.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>{gatePass.driverName}</TableCell>
                  <TableCell><div className="flex items-center gap-1"><Thermometer className="h-4 w-4 text-muted-foreground" />{gatePass.inboundTemperature}°C</div></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedGatePass(gatePass); setShowViewDialog(true); }}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/gate-pass/${gatePass.id}/print`)}>Print Pass</DropdownMenuItem>
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
        <ViewGatePassDialog gatePass={selectedGatePass} open={showViewDialog} onOpenChange={setShowViewDialog} />
      )}
    </div>
  );
}
