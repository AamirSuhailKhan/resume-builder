import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-premium space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
