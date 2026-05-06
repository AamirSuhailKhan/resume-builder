import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-premium grid gap-4 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="h-[520px] w-full" />
      ))}
    </div>
  );
}
