import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LifeBuoy } from "lucide-react";

export default function SupportPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Support" description="Get help and find answers to your questions." />
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <LifeBuoy className="h-12 w-12 mb-4" />
                        <h3 className="text-xl font-semibold">Support Center Coming Soon</h3>
                        <p className="max-w-md">
                            Access documentation, FAQs, and contact our support team from here.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
