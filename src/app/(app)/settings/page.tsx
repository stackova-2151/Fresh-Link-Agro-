import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Settings" description="Manage your application settings and preferences." />
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <Settings className="h-12 w-12 mb-4" />
                        <h3 className="text-xl font-semibold">Settings Page Coming Soon</h3>
                        <p className="max-w-md">
                            This is where you'll manage user roles, notification preferences, and other application settings.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
