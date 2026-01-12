import { cn } from "@/lib/utils";

type PageHeaderProps = {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8", className)}>
            <div className="space-y-1.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
    )
}
