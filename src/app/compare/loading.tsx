import { SkeletonBox, SkeletonText, SkeletonCircle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <section className="max-w-2xl mx-auto">
      <SkeletonText className="w-40 h-8 mb-2" />
      <SkeletonText className="w-64 h-4 mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <SkeletonCircle size={32} />
            <SkeletonText className="flex-1 h-5" />
            <SkeletonText className="w-24 h-5" />
          </div>
        ))}
      </div>
    </section>
  );
}
