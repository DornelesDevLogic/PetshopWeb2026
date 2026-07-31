function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

export function KpisSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 flex flex-col gap-2.5">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

export function ListaSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Pulse className="h-6 w-6 shrink-0 rounded-full" />
          <Pulse className="h-3 flex-1" />
          <Pulse className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}
