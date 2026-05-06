import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-premium space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-[360px]" />
    </div>
  );
}
