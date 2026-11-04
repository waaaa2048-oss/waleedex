import { Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    </div>
  );
}
