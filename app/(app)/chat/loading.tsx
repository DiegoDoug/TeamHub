import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-32" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
