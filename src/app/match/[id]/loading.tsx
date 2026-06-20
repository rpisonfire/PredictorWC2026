import { SkeletonBox, SkeletonText, SkeletonCircle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <section className="max-w-2xl mx-auto">
      <div className="card p-6">
        <div className="flex justify-between items-center">
          <SkeletonText className="w-32 h-3" />
          <SkeletonText className="w-40 h-3" />
        </div>
        <div className="mt-4 flex items-center justify-between text-center gap-4">
          <div className="flex-1 space-y-2">
            <SkeletonCircle size={48} />
            <SkeletonText className="w-20 h-5 mx-auto" />
          </div>
          <SkeletonText className="w-12 h-8" />
          <div className="flex-1 space-y-2">
            <SkeletonCircle size={48} />
            <SkeletonText className="w-20 h-5 mx-auto" />
          </div>
        </div>
      </div>
      <SkeletonBox className="h-60 mt-4" />
      <SkeletonBox className="h-40 mt-4" />
    </section>
  );
}
