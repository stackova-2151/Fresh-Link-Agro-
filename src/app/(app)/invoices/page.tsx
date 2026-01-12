import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function InvoicesPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Invoices" description="View and manage all your invoices." />
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <FileText className="h-12 w-12 mb-4" />
                        <h3 className="text-xl font-semibold">No Invoices Found</h3>
                        <p className="max-w-md">
                           Invoices you generate will appear here. You can generate a new invoice from the Clients page.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
