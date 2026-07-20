"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const WORKOUT_TYPES = [
  { value: "distance", label: "Distance" },
  { value: "speed", label: "Speed" },
  { value: "weights", label: "Weights" },
  { value: "technical", label: "Technical" },
];

const ALL_TYPES = "all";

export function LogHistoryFilters({
  type,
  from,
  to,
}: {
  type?: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  const hasFilters = !!(type || from || to);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="type-filter" className="text-xs">
          Type
        </Label>
        <Select
          value={type ?? ALL_TYPES}
          onValueChange={(v) => update("type", v === ALL_TYPES ? "" : (v ?? ""))}
        >
          <SelectTrigger id="type-filter" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>All types</SelectItem>
            {WORKOUT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="from-filter" className="text-xs">
          From
        </Label>
        <Input
          key={from ?? "none"}
          id="from-filter"
          type="date"
          className="w-40"
          defaultValue={from ?? ""}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="to-filter" className="text-xs">
          To
        </Label>
        <Input
          key={to ?? "none"}
          id="to-filter"
          type="date"
          className="w-40"
          defaultValue={to ?? ""}
          onChange={(e) => update("to", e.target.value)}
        />
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
