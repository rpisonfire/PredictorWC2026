// Skeleton primitives - puls animated placeholdery dla loading states.
export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-app-hover/60 ${className}`} />;
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-app-hover/60 h-4 ${className}`} />;
}

export function SkeletonCircle({ size = 32 }: { size?: number }) {
  return (
    <div
      className="animate-pulse rounded-full bg-app-hover/60 shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

// Skeleton karty meczu (do dashboardu)
export function SkeletonMatchCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonText className="w-20" />
        <SkeletonText className="w-16" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <SkeletonCircle size={24} />
          <SkeletonText className="w-12" />
        </div>
        <SkeletonText className="w-8" />
        <div className="flex items-center gap-2 flex-1 justify-end">
          <SkeletonText className="w-12" />
          <SkeletonCircle size={24} />
        </div>
      </div>
      <div className="flex gap-1.5">
        <SkeletonText className="w-16 h-5" />
        <SkeletonText className="w-12 h-5" />
      </div>
    </div>
  );
}

// Skeleton wiersza rankingu
export function SkeletonRankingRow() {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-app last:border-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SkeletonText className="w-6" />
        <SkeletonCircle size={32} />
        <div className="flex-1 space-y-1.5">
          <SkeletonText className="w-32" />
          <SkeletonText className="w-20 h-3" />
        </div>
      </div>
      <SkeletonText className="w-12 h-6" />
    </div>
  );
}
