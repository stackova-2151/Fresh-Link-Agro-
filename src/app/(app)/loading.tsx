export default function AppLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted animate-pulse" />
      </div>
      {/* Content skeleton */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
