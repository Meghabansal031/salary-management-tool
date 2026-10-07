"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

/** Small dot in the header: green when the backend answers, red when it does not. */
export function ApiStatus() {
  const { isSuccess, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: false,
  });

  const label = isPending ? "Checking API…" : isSuccess ? "API connected" : "API unreachable";
  const color = isPending ? "bg-yellow-400" : isSuccess ? "bg-green-500" : "bg-red-500";

  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}
