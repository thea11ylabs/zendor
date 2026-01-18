"use client";

import { type ReactNode, useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import { ConvexClientProvider } from "@/lib/convex";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <ConvexClientProvider>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>{children}</JotaiProvider>
      </QueryClientProvider>
    </ConvexClientProvider>
  );
}
