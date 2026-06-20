import { SkeletonBox, SkeletonText } from "@/components/Skeleton";

export default function Loading() {
  return (
    <section>
      <SkeletonText className="w-32 h-8 mb-2" />
      <SkeletonText className="w-64 h-4 mb-6" />
      <div className="grid sm:grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBox key={i} className="h-56" />
        ))}
      </div>
    </section>
  );
}
