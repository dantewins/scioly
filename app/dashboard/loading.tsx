export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* PageHeader skeleton */}
      <div className="flex flex-col gap-1.5 py-1">
        <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-56 rounded-md bg-muted/70 animate-pulse" />
      </div>
      {/* Content placeholder */}
    </div>
  )
}
