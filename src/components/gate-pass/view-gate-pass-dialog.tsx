import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GatePass } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Calendar, Clock, Hash, Phone, Thermometer, Truck, User, FileText, Anchor } from 'lucide-react';

interface ViewGatePassDialogProps {
  gatePass: GatePass;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | React.ReactNode }) => (
    <div className="flex items-start">
        <div className="w-8 text-muted-foreground flex justify-center">{icon}</div>
        <div className="flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>
);

export function ViewGatePassDialog({ gatePass, open, onOpenChange }: ViewGatePassDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center justify-between">
            <span>Gate Pass Details</span>
            <Badge variant={gatePass.type === 'IN' ? 'default' : 'destructive'} className={gatePass.type === 'IN' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {gatePass.type}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {gatePass.gatePassNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <DetailItem icon={<User className="h-4 w-4" />} label="Customer/Vendor" value={gatePass.customerName} />
                <DetailItem icon={<Truck className="h-4 w-4" />} label="Vehicle No." value={gatePass.vehicleNumber} />
                <DetailItem icon={<User className="h-4 w-4" />} label="Driver Name" value={gatePass.driverName} />
                <DetailItem icon={<Phone className="h-4 w-4" />} label="Driver Phone" value={gatePass.driverPhone} />
                <DetailItem icon={<Calendar className="h-4 w-4" />} label="Entry Date" value={new Date(gatePass.entryTime).toLocaleDateString()} />
                <DetailItem icon={<Clock className="h-4 w-4" />} label="Entry Time" value={new Date(gatePass.entryTime).toLocaleTimeString()} />
                <DetailItem icon={<Thermometer className="h-4 w-4" />} label="Inbound Temp." value={`${gatePass.inboundTemperature}°C`} />
                {gatePass.outboundTemperature && <DetailItem icon={<Thermometer className="h-4 w-4" />} label="Outbound Temp." value={`${gatePass.outboundTemperature}°C`} />}
                {gatePass.dockNumber && <DetailItem icon={<Anchor className="h-4 w-4" />} label="Dock Number" value={gatePass.dockNumber} />}
                <DetailItem icon={<Hash className="h-4 w-4" />} label="Status" value={<Badge variant={gatePass.status === 'Completed' ? 'secondary' : 'default'} className={
                    gatePass.status === 'On-Premises' ? 'bg-blue-100 text-blue-800' : 
                    gatePass.status === 'Completed' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                }>{gatePass.status}</Badge>} />
            </div>
            <Separator />
            <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="rounded-md border">
                    {gatePass.items.map((item, index) => (
                        <div key={index} className="flex justify-between p-2">
                            <span>{item.name}</span>
                            <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                        </div>
                    ))}
                </div>
            </div>
            {gatePass.notes && (
                 <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">{gatePass.notes}</p>
                </div>
            )}
        </div>
        <div className="flex justify-end gap-2">
            <Button variant="outline">Print</Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
