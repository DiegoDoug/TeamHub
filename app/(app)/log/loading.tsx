import { Skeleton } from "@/components/ui/skeleton";

export default function LogLoading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="mb-4 h-32 rounded-xl" />
      <Skeleton className="h-10 w-40 rounded-md" />
    </div>
  );
}
