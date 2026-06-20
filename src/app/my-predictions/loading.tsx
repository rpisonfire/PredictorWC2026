import { SkeletonText, SkeletonBox } from "@/components/Skeleton";

export default function Loading() {
  return (
    <section className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <SkeletonText className="w-32 h-8 mb-2" />
          <SkeletonText className="w-24 h-3" />
        </div>
        <div className="text-right space-y-2">
          <SkeletonBox className="w-16 h-10 ml-auto" />
          <SkeletonText className="w-12 h-3" />
        </div>
      </div>
      <SkeletonBox className="h-20 mb-6" />
      <SkeletonText className="w-32 h-4 mb-3" />
      <div className="space-y-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-24" />
        ))}
      </div>
      <SkeletonText className="w-32 h-4 mb-3" />
      <div className="grid sm:grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-32" />
        ))}
      </div>
    </section>
  );
}
