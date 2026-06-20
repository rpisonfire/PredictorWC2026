import { SkeletonRankingRow, SkeletonText } from "@/components/Skeleton";

export default function Loading() {
  return (
    <section className="max-w-3xl mx-auto">
      <SkeletonText className="w-40 h-8 mb-2" />
      <SkeletonText className="w-64 h-4 mb-6" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <SkeletonText className="w-20 h-3" />
            <SkeletonText className="w-12 h-6" />
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRankingRow key={i} />
        ))}
      </div>
    </section>
  );
}
