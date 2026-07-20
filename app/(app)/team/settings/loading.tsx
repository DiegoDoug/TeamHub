import { Skeleton } from "@/components/ui/skeleton";

export default function TeamSettingsLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="max-w-sm space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}
