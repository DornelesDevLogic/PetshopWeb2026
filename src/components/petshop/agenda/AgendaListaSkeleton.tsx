function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

/** Esqueleto da Visualização Rápida — aparece na hora do clique, antes dos
 * dados (agenda + profissionais + serviços) voltarem do backend. */
export default function AgendaListaSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Pulse className="h-7 w-64" />
        <div className="flex gap-2">
          <Pulse className="h-8 w-28" />
          <Pulse className="h-8 w-20" />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Pulse className="h-3 w-16" />
              <Pulse className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Pulse className="h-4 w-12" />
              <Pulse className="h-4 w-20" />
              <Pulse className="h-4 flex-1" />
              <Pulse className="h-4 w-24" />
              <Pulse className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
