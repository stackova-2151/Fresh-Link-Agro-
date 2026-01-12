'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { rentalItems, chambers as initialChambers } from "@/lib/data";
import { OptimizeChamberPlacementOutput, optimizeChamberPlacement } from "@/ai/flows/optimize-chamber-placement";
import { BrainCircuit, Loader2, Shuffle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function OptimizationPage() {
    const [loading, setLoading] = useState(false);
    const [optimizations, setOptimizations] = useState<OptimizeChamberPlacementOutput | null>(null);
    const { toast } = useToast();

    const handleOptimize = async () => {
        setLoading(true);
        setOptimizations(null);
        
        try {
            const itemsToPlace = rentalItems
                .filter(item => item.quantityAvailable > 0)
                .map(item => ({
                    name: item.name,
                    expiryDate: item.expiryDate.toISOString().split('T')[0],
                    turnoverRate: Math.random(), // Mock turnover rate
                    quantity: item.quantityAvailable,
                }));
            
            const availableChambers = initialChambers.map(chamber => ({
                name: chamber.name,
                temperature: chamber.temperature,
            }));

            const result = await optimizeChamberPlacement({
                items: itemsToPlace,
                chambers: availableChambers
            });
            setOptimizations(result);
            toast({
                title: "Optimization Complete",
                description: "AI has generated optimal placement suggestions.",
            });
        } catch (error) {
            console.error("Optimization error:", error);
            toast({
                variant: "destructive",
                title: "AI Error",
                description: "Failed to generate optimization plan.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="AI Chamber Optimizer" description="Let AI suggest the best placement for your items to improve efficiency and reduce spoilage.">
                 <Button onClick={handleOptimize} disabled={loading}>
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <BrainCircuit className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Optimizing...' : 'Generate Plan'}
                </Button>
            </PageHeader>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Items to Place</CardTitle>
                        <CardDescription>{rentalItems.length} distinct items in inventory.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {rentalItems.map(item => (
                                <li key={item.id} className="flex justify-between items-center text-sm">
                                    <span>{item.name}</span>
                                    <span className="text-muted-foreground font-mono">{item.quantityAvailable} {item.unit}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Optimization Results</CardTitle>
                        <CardDescription>AI-powered suggestions for item placement.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                <p>AI is thinking...</p>
                                <p className="text-xs">This may take a moment.</p>
                            </div>
                        )}
                        {!loading && !optimizations && (
                             <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                                <Shuffle className="h-8 w-8 mb-4" />
                                <p>Your optimization plan will appear here.</p>
                                <p className="text-xs">Click "Generate Plan" to start.</p>
                            </div>
                        )}
                        {optimizations && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Suggested Chamber</TableHead>
                                        <TableHead>Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {optimizations.map((opt, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{opt.itemName} <span className="text-muted-foreground">({opt.quantity})</span></TableCell>
                                            <TableCell><Badge variant="secondary">{opt.chamberName}</Badge></TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{opt.reason}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
