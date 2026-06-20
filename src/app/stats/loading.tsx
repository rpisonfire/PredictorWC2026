import { SkeletonBox, SkeletonText } from "@/components/Skeleton";

export default function Loading() {
  return (
    <section className="max-w-4xl mx-auto">
      <SkeletonText className="w-48 h-8 mb-2" />
      <SkeletonText className="w-64 h-4 mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-24" />
        ))}
      </div>
      <SkeletonBox className="h-32 mb-6" />
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-48" />
        ))}
      </div>
    </section>
  );
}
