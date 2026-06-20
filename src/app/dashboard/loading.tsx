import { SkeletonText, SkeletonMatchCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <section>
      <SkeletonText className="w-32 h-8 mb-2" />
      <SkeletonText className="w-96 h-4 mb-6 max-w-full" />
      <div className="mb-10">
        <SkeletonText className="w-48 h-6 mb-3" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMatchCard key={i} />
          ))}
        </div>
      </div>
      <SkeletonText className="w-32 h-5 mb-3" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonMatchCard key={i} />
        ))}
      </div>
    </section>
  );
}
