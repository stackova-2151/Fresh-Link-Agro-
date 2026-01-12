import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Reports" description="Generate and view reports for inventory, financials, and operations." />
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <FileText className="h-12 w-12 mb-4" />
                        <h3 className="text-xl font-semibold">Reports Feature Coming Soon</h3>
                        <p className="max-w-md">
                            This section will allow you to generate detailed reports on various aspects of your operations. Check back for updates!
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
