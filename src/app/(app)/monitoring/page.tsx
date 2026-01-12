'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chambers as initialChambers } from "@/lib/data";
import type { Chamber, RentalItem } from "@/lib/types";
import { AlertTriangle, BrainCircuit, CheckCircle, Thermometer, Waves } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useState } from "react";
import { detectTemperatureAnomalies, DetectTemperatureAnomaliesOutput } from "@/ai/flows/detect-temperature-anomalies";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MonitoringPage() {
    const { toast } = useToast();
    const [chambers, setChambers] = useState<Chamber[]>(initialChambers);
    const [loadingAnomalies, setLoadingAnomalies] = useState<Record<string, boolean>>({});
    const [anomalyResults, setAnomalyResults] = useState<Record<string, DetectTemperatureAnomaliesOutput | null>>({});

    const handleCheckAnomalies = async (chamber: Chamber) => {
        if (!chamber.recentTemperatures || chamber.recentTemperatures.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Temperature Data',
                description: `No recent temperature data available for ${chamber.name}.`,
            });
            return;
        }

        setLoadingAnomalies(prev => ({ ...prev, [chamber.id]: true }));
        setAnomalyResults(prev => ({ ...prev, [chamber.id]: null }));

        try {
            const result = await detectTemperatureAnomalies({
                chamberId: chamber.id,
                temperatureReadings: chamber.recentTemperatures,
                expectedTemperatureRange: chamber.temperature,
            });
            setAnomalyResults(prev => ({ ...prev, [chamber.id]: result }));
        } catch (error) {
            console.error("Error detecting anomalies:", error);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'Could not run anomaly detection.',
            });
        } finally {
            setLoadingAnomalies(prev => ({ ...prev, [chamber.id]: false }));
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Temperature Monitoring" description="Real-time temperature tracking and anomaly detection for all chambers." />

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {chambers.map(chamber => {
                    const chartData = chamber.recentTemperatures?.map((temp, index) => ({
                        time: `${(index + 1) * 10}m ago`,
                        temperature: temp,
                    })) || [];
                    
                    const anomaly = anomalyResults[chamber.id];

                    return (
                        <Card key={chamber.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="font-headline">{chamber.name}</CardTitle>
                                    <div className="flex items-center gap-2 text-lg font-bold">
                                        <Thermometer className="h-5 w-5" />
                                        <span>{chamber.currentTemperature}°C</span>
                                    </div>
                                </div>
                                <CardDescription>Expected Range: {chamber.temperature}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={{}} className="h-[150px] w-full">
                                    <AreaChart data={chartData} accessibilityLayer margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id={`color-${chamber.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                        <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} reversed />
                                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                        <Tooltip cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} content={<ChartTooltipContent indicator="line" />} />
                                        <Area type="monotone" dataKey="temperature" stroke="var(--color-chart-1)" strokeWidth={2} fillOpacity={1} fill={`url(#color-${chamber.id})`} />
                                    </AreaChart>
                                </ChartContainer>
                                <div className="mt-4">
                                    {anomaly && (
                                        <Alert variant={anomaly.hasAnomaly ? "destructive" : "default"} className={!anomaly.hasAnomaly ? "bg-green-50 border-green-200 text-green-800" : ""}>
                                            {anomaly.hasAnomaly ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                            <AlertTitle>{anomaly.hasAnomaly ? 'Anomaly Detected!' : 'All Clear'}</AlertTitle>
                                            <AlertDescription>
                                                {anomaly.anomalyDescription}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                                <Button
                                    className="w-full mt-4"
                                    onClick={() => handleCheckAnomalies(chamber)}
                                    disabled={loadingAnomalies[chamber.id]}
                                >
                                    {loadingAnomalies[chamber.id] ? <Waves className="mr-2 h-4 w-4 animate-pulse" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                    {loadingAnomalies[chamber.id] ? "Analyzing..." : "Check for Anomalies"}
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
