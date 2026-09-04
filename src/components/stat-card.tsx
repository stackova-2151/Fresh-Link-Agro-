import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
    title: string;
    value: string;
    description?: string;
    icon: React.ReactNode;
    className?: string;
}

export function StatCard({ title, value, description, icon, className }: StatCardProps) {
    return (
        <Card className={cn("border-l-4 border-l-teal-600", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <span className="text-teal-600 [&_svg]:text-teal-600">{icon}</span>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}
