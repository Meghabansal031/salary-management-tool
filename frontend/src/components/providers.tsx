"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/** Gives every page access to TanStack Query, which caches and refreshes server data. */
export function Providers({ children }: { children: ReactNode }) {
  // Created once per browser tab (useState), not on every render.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // data counts as fresh for 30 s, so tab switches do not refetch
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
