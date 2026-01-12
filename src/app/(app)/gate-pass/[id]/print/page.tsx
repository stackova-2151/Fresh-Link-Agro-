
'use client';

import { useParams } from 'next/navigation';
import { gatePasses } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GatePass } from '@/lib/types';

const DetailRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="flex justify-between py-2 border-b">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{value || 'N/A'}</span>
    </div>
);

export default function PrintGatePassPage() {
    const params = useParams();
    const [gatePass, setGatePass] = useState<GatePass | null>(null);

    useEffect(() => {
        if (params.id) {
            const pass = gatePasses.find(p => p.id === params.id);
            setGatePass(pass || null);
        }
    }, [params.id]);

    if (!gatePass) {
        return <div className="flex items-center justify-center h-screen">Loading Gate Pass...</div>;
    }

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-primary">GATE PASS</h1>
                        <p className="text-muted-foreground">{gatePass.gatePassNumber}</p>
                    </div>
                    <Badge variant={gatePass.type === 'IN' ? 'default' : 'destructive'} className={`text-lg px-4 py-1 ${gatePass.type === 'IN' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {gatePass.type}
                    </Badge>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                    <DetailRow label="Client / Vendor" value={gatePass.clientName} />
                    <DetailRow label="Vehicle Number" value={gatePass.vehicleNumber} />
                    <DetailRow label="Driver Name" value={gatePass.driverName} />
                    <DetailRow label="Driver Phone" value={gatePass.driverPhone} />
                    <DetailRow label="Entry Date" value={new Date(gatePass.entryTime).toLocaleDateString()} />
                    <DetailRow label="Entry Time" value={new Date(gatePass.entryTime).toLocaleTimeString()} />
                     {gatePass.exitTime && <DetailRow label="Exit Time" value={new Date(gatePass.exitTime).toLocaleTimeString()} />}
                    <DetailRow label="Dock Time" value={gatePass.dockTime} />
                    <DetailRow label="Dock Number" value={gatePass.dockNumber} />
                    <DetailRow label="Inbound Temp" value={`${gatePass.inboundTemperature}°C`} />
                    {gatePass.outboundTemperature && <DetailRow label="Outbound Temp" value={`${gatePass.outboundTemperature}°C`} />}
                </div>

                <Separator className="my-6" />

                <div>
                    <h3 className="text-lg font-semibold mb-2">Items</h3>
                    <div className="border rounded-md">
                        <div className="flex justify-between bg-muted p-2 font-semibold">
                            <span>Item Name</span>
                            <span>Quantity</span>
                        </div>
                        {gatePass.items.map((item, index) => (
                            <div key={index} className="flex justify-between p-2 border-t">
                                <span>{item.name}</span>
                                <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {gatePass.notes && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">Notes</h3>
                        <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md">{gatePass.notes}</p>
                    </div>
                )}
                
                <footer className="mt-8 pt-6 border-t text-center">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="border-t-2 border-gray-300 pt-2">
                           <p className="text-sm text-muted-foreground">Driver's Signature</p>
                        </div>
                         <div className="border-t-2 border-gray-300 pt-2">
                           <p className="text-sm text-muted-foreground">Security Signature</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-8">This is a computer-generated document.</p>
                </footer>
            </div>
             <div className="max-w-2xl mx-auto mt-4 text-center">
                <Button onClick={() => window.print()} className="print:hidden">
                    <Printer className="mr-2 h-4 w-4" /> Print Gate Pass
                </Button>
            </div>
        </div>
    );
}
