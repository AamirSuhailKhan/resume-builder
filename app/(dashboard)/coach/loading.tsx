import { Skeleton } from "@/components/ui/skeleton";

export default function CoachLoading() {
  return (
    <div className="-mx-4 flex h-[calc(100vh-4rem)] gap-4 p-4 sm:-mx-6 lg:-mx-8">
      <Skeleton className="hidden h-full w-[260px] shrink-0 rounded-lg md:block" />
      <Skeleton className="h-full flex-1 rounded-lg" />
    </div>
  );
}
